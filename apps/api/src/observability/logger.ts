import { randomUUID } from "node:crypto";
import type { IncomingMessage, ServerResponse } from "node:http";
import type { Params } from "nestjs-pino";
import type { Env } from "../env";

const REQUEST_ID_HEADER = "x-request-id";

/**
 * pino configuration for structured logging with request-id propagation and
 * secret redaction (docs/architecture/06-security.md §5). An inbound
 * `x-request-id` is honoured (web→api correlation) and echoed on the response;
 * the same id is forwarded to the worker on the job payload downstream.
 */
export function loggerParams(env: Env): Params {
  return {
    pinoHttp: {
      level: env.OMNIO_LOG_LEVEL,
      genReqId: (req: IncomingMessage, res: ServerResponse) => {
        const incoming = req.headers[REQUEST_ID_HEADER];
        const id = (Array.isArray(incoming) ? incoming[0] : incoming) ?? randomUUID();
        res.setHeader(REQUEST_ID_HEADER, id);
        return id;
      },
      // Never let credentials reach the logs.
      redact: {
        remove: true,
        paths: ["req.headers.authorization", "req.headers.cookie", 'res.headers["set-cookie"]'],
      },
      // Health/metrics probes would drown out real traffic.
      autoLogging: {
        ignore: (req: IncomingMessage) =>
          req.url === "/healthz" || req.url === "/readyz" || req.url === "/metrics",
      },
    },
  };
}
