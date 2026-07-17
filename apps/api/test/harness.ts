import { existsSync } from "node:fs";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { NestFactory } from "@nestjs/core";
import type { NestExpressApplication } from "@nestjs/platform-express";
import { createPrismaClient, deployMigrations, type PrismaClient } from "@omnio/db";
import { createStorageDriver, type StorageDriver } from "@omnio/storage";
import { PostgreSqlContainer, type StartedPostgreSqlContainer } from "@testcontainers/postgresql";
import { RedisContainer, type StartedRedisContainer } from "@testcontainers/redis";
import type { Server } from "node:http";
import { AppModule } from "../src/app.module";
import { loadEnv, type Env } from "../src/env";
import { configureHttpSecurity } from "../src/security/http-security";

/** Integration tests need a Docker daemon; skip cleanly where there is none. */
export function hasDocker(): boolean {
  return existsSync("/var/run/docker.sock") || Boolean(process.env.DOCKER_HOST);
}

export const TEST_ORIGIN = "http://omnio.test";

export interface Harness {
  app: NestExpressApplication;
  server: Server;
  prisma: PrismaClient;
  storage: StorageDriver;
  env: Env;
  stop: () => Promise<void>;
}

export async function startHarness(): Promise<Harness> {
  const postgres: StartedPostgreSqlContainer = await new PostgreSqlContainer(
    "postgres:17-alpine",
  ).start();
  const redis: StartedRedisContainer = await new RedisContainer("redis:7-alpine").start();
  const storageRoot = await mkdtemp(join(tmpdir(), "omnio-it-"));

  const databaseUrl = postgres.getConnectionUri();
  const redisUrl = redis.getConnectionUrl();

  const env = loadEnv({
    NODE_ENV: "test",
    OMNIO_DATABASE_URL: databaseUrl,
    OMNIO_REDIS_URL: redisUrl,
    OMNIO_STORAGE_ROOT: storageRoot,
    OMNIO_SESSION_SECRET: "integration-test-session-secret-0123456789",
    OMNIO_ALLOWED_ORIGINS: TEST_ORIGIN,
    OMNIO_SWEEP_INTERVAL_MINUTES: "60",
  });

  await deployMigrations({ databaseUrl });

  const app = await NestFactory.create<NestExpressApplication>(AppModule.forRoot(env), {
    logger: false,
  });
  configureHttpSecurity(app, env);
  await app.init();

  const prisma = createPrismaClient({ databaseUrl });
  const storage = createStorageDriver({ root: storageRoot });

  return {
    app,
    server: app.getHttpServer(),
    prisma,
    storage,
    env,
    stop: async () => {
      await prisma.$disconnect().catch(() => undefined);
      await app.close().catch(() => undefined);
      await redis.stop().catch(() => undefined);
      await postgres.stop().catch(() => undefined);
      await rm(storageRoot, { recursive: true, force: true }).catch(() => undefined);
    },
  };
}

/**
 * Mirrors the worker's core.echo processor and TTL sweeper using the same shared
 * primitives, so the api integration test can drive the full lifecycle in one
 * process. The worker's own code paths are covered by its unit tests.
 */
export async function runEchoJob(
  prisma: PrismaClient,
  storage: StorageDriver,
  jobId: string,
  ttlMs: number,
): Promise<void> {
  const job = await prisma.job.findUniqueOrThrow({
    where: { id: jobId },
    include: { inputs: true },
  });
  for (const input of job.inputs) {
    const outKey = storage.generateKey();
    const stat = await storage.put(
      "scratch",
      outKey,
      await storage.stream(input.area, input.driverKey),
    );
    await prisma.fileObject.create({
      data: {
        area: "scratch",
        driverKey: outKey,
        mime: input.mime,
        size: BigInt(stat.size),
        hash: input.hash,
        originalName: `echo-${input.originalName}`,
        ownerId: job.ownerId,
        ttlAt: new Date(Date.now() + ttlMs),
        jobOutputId: job.id,
      },
    });
  }
  await prisma.job.update({
    where: { id: jobId },
    data: { status: "completed", progress: 100, finishedAt: new Date() },
  });
}

export async function sweepScratch(
  prisma: PrismaClient,
  storage: StorageDriver,
  now: Date = new Date(),
): Promise<number> {
  const expired = await prisma.fileObject.findMany({
    where: { area: "scratch", ttlAt: { lte: now } },
  });
  for (const file of expired) {
    await storage.delete("scratch", file.driverKey).catch(() => undefined);
    await prisma.fileObject.delete({ where: { id: file.id } }).catch(() => undefined);
  }
  return expired.length;
}
