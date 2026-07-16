import type { OnModuleDestroy } from "@nestjs/common";
import { Inject, Injectable } from "@nestjs/common";
import { Redis } from "ioredis";
import { OMNIO_ENV } from "../config/config.module";
import type { Env } from "../env";

/**
 * Shared Redis connection for rate limiting, caching, and readiness checks.
 * BullMQ creates its own dedicated connections (a blocking consumer must not
 * share a client), so this one is safe to reuse across request handlers.
 * `maxRetriesPerRequest: null` keeps commands queued through brief reconnects.
 */
@Injectable()
export class RedisService implements OnModuleDestroy {
  readonly client: Redis;

  constructor(@Inject(OMNIO_ENV) env: Env) {
    this.client = new Redis(env.OMNIO_REDIS_URL, { maxRetriesPerRequest: null });
  }

  ping(): Promise<string> {
    return this.client.ping();
  }

  async onModuleDestroy(): Promise<void> {
    await this.client.quit().catch(() => this.client.disconnect());
  }
}
