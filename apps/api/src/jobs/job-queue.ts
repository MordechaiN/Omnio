import type { OnModuleDestroy } from "@nestjs/common";
import { Inject, Injectable } from "@nestjs/common";
import { createJobsConnection, OMNIO_JOB_QUEUE } from "@omnio/jobs";
import { Queue } from "bullmq";
import type { Redis } from "ioredis";
import { OMNIO_ENV } from "../config/config.module";
import type { Env } from "../env";

/** Owns the producer-side BullMQ queue and its dedicated Redis connection. */
@Injectable()
export class JobQueue implements OnModuleDestroy {
  readonly queue: Queue;
  private readonly connection: Redis;

  constructor(@Inject(OMNIO_ENV) env: Env) {
    this.connection = createJobsConnection(env.OMNIO_REDIS_URL);
    this.queue = new Queue(OMNIO_JOB_QUEUE, { connection: this.connection });
  }

  async onModuleDestroy(): Promise<void> {
    await this.queue.close();
    await this.connection.quit().catch(() => this.connection.disconnect());
  }
}
