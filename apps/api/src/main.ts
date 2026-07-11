import "reflect-metadata";
import { NestFactory } from "@nestjs/core";
import { AppModule } from "./app.module";
import { loadEnv } from "./env";

async function bootstrap(): Promise<void> {
  const env = loadEnv();
  const app = await NestFactory.create(AppModule);
  app.enableShutdownHooks();
  await app.listen(env.OMNIO_API_PORT);
  // eslint-disable-next-line no-console -- structured logging (pino) arrives in M3
  console.log(`omnio api listening on :${env.OMNIO_API_PORT}`);
}

bootstrap().catch((error: unknown) => {
  // eslint-disable-next-line no-console -- last-resort output before exit
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
