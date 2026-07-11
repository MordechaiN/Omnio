import { createServer } from "node:http";
import { z } from "zod";
import { healthPayload } from "./health";

/**
 * M1 skeleton: a health endpoint and clean shutdown, nothing more.
 * M3 adds BullMQ consumers; module processors mount via the registry in M4.
 * This process must NEVER grow an HTTP API beyond health/metrics — jobs
 * arrive exclusively through the queue (docs/architecture/01-system-overview.md).
 */
const EnvSchema = z.object({
  OMNIO_WORKER_HEALTH_PORT: z.coerce.number().int().min(1).max(65535).default(4100),
});

const env = EnvSchema.parse(process.env);

const server = createServer((req, res) => {
  if (req.url === "/healthz" || req.url === "/readyz") {
    res.writeHead(200, { "content-type": "application/json" });
    res.end(JSON.stringify(healthPayload(process.uptime())));
    return;
  }
  res.writeHead(404, { "content-type": "application/json" });
  res.end(JSON.stringify({ error: "not_found" }));
});

server.listen(env.OMNIO_WORKER_HEALTH_PORT, () => {
  // eslint-disable-next-line no-console -- structured logging (pino) arrives in M3
  console.log(`omnio worker health on :${env.OMNIO_WORKER_HEALTH_PORT}`);
});

for (const signal of ["SIGTERM", "SIGINT"] as const) {
  process.on(signal, () => {
    server.close(() => process.exit(0));
  });
}
