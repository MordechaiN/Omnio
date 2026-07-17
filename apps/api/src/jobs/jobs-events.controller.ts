import { Controller, Get, Param, Req, Res } from "@nestjs/common";
import {
  jobProgressChannel,
  ProgressEventSchema,
  TERMINAL_STATUSES,
  type ProgressEvent,
} from "@omnio/jobs";
import type { Request, Response } from "express";
import { CurrentUser } from "../auth/current-user.decorator";
import type { AuthedUser } from "../auth/types";
import { RedisService } from "../infra/redis.service";
import { JobsService } from "./jobs.service";

const HEARTBEAT_MS = 15_000;

/**
 * Server-Sent Events for live job progress (docs/architecture/01-system-overview.md §3):
 * server→client only, proxy-friendly, auto-reconnecting. The api subscribes to
 * the worker's Redis progress channel and relays validated events.
 */
@Controller("api/v1/jobs")
export class JobsEventsController {
  constructor(
    private readonly jobs: JobsService,
    private readonly redis: RedisService,
  ) {}

  @Get(":id/events")
  async events(
    @Param("id") id: string,
    @CurrentUser() user: AuthedUser,
    @Req() req: Request,
    @Res() res: Response,
  ): Promise<void> {
    // Ownership check (throws 404 before the stream opens).
    const job = await this.jobs.get(user.id, id);

    res.writeHead(200, {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    });

    const send = (event: ProgressEvent): void => {
      res.write(`data: ${JSON.stringify(event)}\n\n`);
    };

    send({ jobId: job.id, status: job.status, progress: job.progress, error: job.error });
    if (TERMINAL_STATUSES.has(job.status)) {
      res.end();
      return;
    }

    const subscriber = this.redis.client.duplicate();
    const heartbeat = setInterval(() => res.write(": ping\n\n"), HEARTBEAT_MS);
    let closed = false;
    const cleanup = (): void => {
      if (closed) return;
      closed = true;
      clearInterval(heartbeat);
      subscriber.removeAllListeners();
      void subscriber.quit().catch(() => subscriber.disconnect());
    };

    subscriber.on("message", (_channel, payload: string) => {
      const parsed = ProgressEventSchema.safeParse(safeJson(payload));
      if (!parsed.success) return;
      send(parsed.data);
      if (TERMINAL_STATUSES.has(parsed.data.status)) {
        cleanup();
        res.end();
      }
    });

    await subscriber.subscribe(jobProgressChannel(id));

    // Close the race: the job may have finished between the DB read and the
    // subscription. Re-read and flush a terminal state if we missed it.
    const latest = await this.jobs.get(user.id, id).catch(() => job);
    if (!closed && TERMINAL_STATUSES.has(latest.status)) {
      send({
        jobId: latest.id,
        status: latest.status,
        progress: latest.progress,
        error: latest.error,
      });
      cleanup();
      res.end();
    }

    req.on("close", cleanup);
  }
}

function safeJson(value: string): unknown {
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}
