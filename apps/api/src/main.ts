import "reflect-metadata";
import { NestFactory } from "@nestjs/core";
import { deployMigrations } from "@omnio/db";
import { Logger } from "nestjs-pino";
import { AppModule } from "./app.module";
import { loadEnv } from "./env";

async function bootstrap(): Promise<void> {
  const env = loadEnv();

  // Migrations run before anything connects; Prisma's advisory lock makes this
  // safe with multiple api replicas (docs/architecture/01-system-overview.md §7).
  await deployMigrations({ databaseUrl: env.OMNIO_DATABASE_URL });

  const app = await NestFactory.create(AppModule.forRoot(env), { bufferLogs: true });
  const logger = app.get(Logger);
  app.useLogger(logger);
  app.enableShutdownHooks();

  await app.listen(env.OMNIO_API_PORT, env.OMNIO_API_HOST);
  logger.log(`omnio api listening on ${env.OMNIO_API_HOST}:${env.OMNIO_API_PORT}`);
}

bootstrap().catch((error: unknown) => {
  process.stderr.write(`${error instanceof Error ? (error.stack ?? error.message) : error}\n`);
  process.exit(1);
});
