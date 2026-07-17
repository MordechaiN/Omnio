import { pino, type Logger } from "pino";
import type { Env } from "./env";

export function createLogger(env: Env): Logger {
  return pino({ level: env.OMNIO_LOG_LEVEL, base: { service: "omnio-worker" } });
}
