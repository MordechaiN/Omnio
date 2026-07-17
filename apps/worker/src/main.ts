import { createServer } from "node:http";
import { createPrismaClient } from "@omnio/db";
import { createJobsConnection, OMNIO_JOB_QUEUE, OMNIO_MAINTENANCE_QUEUE } from "@omnio/jobs";
import { createStorageDriver } from "@omnio/storage";
import { Worker } from "bullmq";
import { loadEnv } from "./env";
import { healthPayload } from "./health";
import { createLogger } from "./logger";
import { createProcessor } from "./processor";
import { createSweepProcessor } from "./sweeper";

/**
 * The worker consumes jobs exclusively through the queue and must NEVER grow an
 * HTTP API beyond health/metrics (docs/architecture/01-system-overview.md §3).
 */
function main(): void {
  const env = loadEnv();
  const logger = createLogger(env);

  const prisma = createPrismaClient({ databaseUrl: env.OMNIO_DATABASE_URL });
  const storage = createStorageDriver({ root: env.OMNIO_STORAGE_ROOT });
  const connection = createJobsConnection(env.OMNIO_REDIS_URL);
  const maintenanceConnection = createJobsConnection(env.OMNIO_REDIS_URL);
  const publisher = createJobsConnection(env.OMNIO_REDIS_URL);

  const worker = new Worker(
    OMNIO_JOB_QUEUE,
    createProcessor({
      prisma,
      storage,
      publisher,
      ttlMs: env.OMNIO_SCRATCH_TTL_HOURS * 3_600_000,
      logger,
    }),
    { connection, concurrency: env.OMNIO_WORKER_CONCURRENCY },
  );

  worker.on("failed", (job, error) => {
    logger.error({ jobId: job?.id, err: error.message }, "bullmq job failed");
  });
  worker.on("ready", () => logger.info("worker ready; consuming jobs"));

  // Maintenance: the repeatable sweep is scheduled by the api; the worker runs
  // it single-file so concurrent replicas never race on the same rows.
  const maintenanceWorker = new Worker(
    OMNIO_MAINTENANCE_QUEUE,
    createSweepProcessor({ prisma, storage, logger }),
    { connection: maintenanceConnection, concurrency: 1 },
  );
  maintenanceWorker.on("failed", (_job, error) => {
    logger.error({ err: error.message }, "maintenance sweep failed");
  });

  const server = createServer((req, res) => {
    if (req.url === "/healthz" || req.url === "/readyz") {
      res.writeHead(200, { "content-type": "application/json" });
      res.end(JSON.stringify(healthPayload(process.uptime())));
      return;
    }
    res.writeHead(404, { "content-type": "application/json" });
    res.end(JSON.stringify({ error: "not_found" }));
  });
  server.listen(env.OMNIO_WORKER_HEALTH_PORT, () =>
    logger.info(`worker health on :${env.OMNIO_WORKER_HEALTH_PORT}`),
  );

  let shuttingDown = false;
  const shutdown = (signal: string): void => {
    if (shuttingDown) return;
    shuttingDown = true;
    logger.info({ signal }, "shutting down");
    void (async () => {
      server.close();
      await Promise.allSettled([worker.close(), maintenanceWorker.close()]);
      await Promise.allSettled([
        prisma.$disconnect(),
        connection.quit(),
        maintenanceConnection.quit(),
        publisher.quit(),
      ]);
      process.exit(0);
    })();
  };
  for (const signal of ["SIGTERM", "SIGINT"] as const) {
    process.on(signal, () => shutdown(signal));
  }
}

try {
  main();
} catch (error) {
  process.stderr.write(`${error instanceof Error ? (error.stack ?? error.message) : error}\n`);
  process.exit(1);
}
