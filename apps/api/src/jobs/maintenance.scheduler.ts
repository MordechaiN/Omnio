import type { OnModuleDestroy, OnModuleInit } from "@nestjs/common";
import { Inject, Injectable } from "@nestjs/common";
import { createJobsConnection, OMNIO_MAINTENANCE_QUEUE, OMNIO_SWEEP_JOB } from "@omnio/jobs";
import { Queue } from "bullmq";
import type { Redis } from "ioredis";
import { OMNIO_ENV } from "../config/config.module";
import type { Env } from "../env";

/**
 * Registers the repeatable TTL sweep as a BullMQ job scheduler. A single
 * scheduler enqueues one sweep per interval across the whole cluster, so
 * multiple api replicas never double-schedule (docs/architecture/01-system-overview.md §3).
 */
@Injectable()
export class MaintenanceScheduler implements OnModuleInit, OnModuleDestroy {
  private readonly queue: Queue;
  private readonly connection: Redis;
  private readonly intervalMs: number;

  constructor(@Inject(OMNIO_ENV) env: Env) {
    this.connection = createJobsConnection(env.OMNIO_REDIS_URL);
    this.queue = new Queue(OMNIO_MAINTENANCE_QUEUE, { connection: this.connection });
    this.intervalMs = env.OMNIO_SWEEP_INTERVAL_MINUTES * 60_000;
  }

  async onModuleInit(): Promise<void> {
    await this.queue.upsertJobScheduler(
      OMNIO_SWEEP_JOB,
      { every: this.intervalMs },
      { name: OMNIO_SWEEP_JOB, opts: { removeOnComplete: true, removeOnFail: 100 } },
    );
  }

  async onModuleDestroy(): Promise<void> {
    await this.queue.close();
    await this.connection.quit().catch(() => this.connection.disconnect());
  }
}
