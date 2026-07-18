import { Controller, Get, Inject } from "@nestjs/common";
import { Public } from "../auth/public.decorator";
import { readManifest, type ReleaseManifest } from "../build-info";
import { OMNIO_ENV } from "../config/config.module";
import type { Env } from "../env";
import { RedisService } from "../infra/redis.service";

/**
 * `GET /api/version` — returns the complete release manifest describing the
 * running deployment. Deliberately outside the ts-rest product contract and
 * unauthenticated: it is deployment metadata (like /healthz), consumed by the
 * web About page, the footer, and the release-verification tooling to confirm
 * Oracle and GitHub report the same build (docs/architecture/09-releases.md).
 */
@Public()
@Controller("api")
export class VersionController {
  constructor(
    @Inject(OMNIO_ENV) private readonly env: Env,
    private readonly redis: RedisService,
  ) {}

  @Get("version")
  async version(): Promise<ReleaseManifest> {
    return readManifest(this.env, { redis: await this.redisVersion() });
  }

  /** Parse `redis_version` from INFO server; null if Redis is unreachable. */
  private async redisVersion(): Promise<string | null> {
    try {
      const info = await this.redis.client.info("server");
      return /redis_version:(\S+)/.exec(info)?.[1] ?? null;
    } catch {
      return null;
    }
  }
}
