import { access, constants } from "node:fs/promises";
import { Controller, Get, Inject, ServiceUnavailableException } from "@nestjs/common";
import { Public } from "../auth/public.decorator";
import { OMNIO_ENV } from "../config/config.module";
import type { Env } from "../env";
import { PrismaService } from "../infra/prisma.service";
import { RedisService } from "../infra/redis.service";

type DependencyStatus = "up" | "down";

/** Per-service health for the About page: three-state, never throws. */
type ServiceHealth = "healthy" | "warning" | "offline";
type ServicesReport = Record<"api" | "database" | "redis" | "worker" | "storage", ServiceHealth>;

/**
 * Container orchestration endpoints — intentionally outside the public
 * ts-rest contract; they belong to the deployment, not the product API.
 */
@Public()
@Controller()
export class HealthController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
    @Inject(OMNIO_ENV) private readonly env: Env,
  ) {}

  /**
   * Live status of each service, for the About page. Always 200 with a
   * three-state verdict per service so the UI can render badges without
   * treating a degraded worker as a page error.
   */
  @Get("api/health")
  async services(): Promise<ServicesReport> {
    const [database, redis, worker, storage] = await Promise.all([
      this.checkPostgres().then((s) => (s === "up" ? "healthy" : "offline") as ServiceHealth),
      this.checkRedis().then((s) => (s === "up" ? "healthy" : "offline") as ServiceHealth),
      this.checkWorker(),
      this.checkStorage(),
    ]);
    return { api: "healthy", database, redis, worker, storage };
  }

  private async checkWorker(): Promise<ServiceHealth> {
    const base = this.env.OMNIO_WORKER_HEALTH_URL;
    const probe = async (path: string): Promise<boolean> => {
      try {
        const res = await fetch(`${base}${path}`, { signal: AbortSignal.timeout(2000) });
        return res.ok;
      } catch {
        return false;
      }
    };
    if (await probe("/readyz")) return "healthy";
    if (await probe("/healthz")) return "warning";
    return "offline";
  }

  private async checkStorage(): Promise<ServiceHealth> {
    try {
      await access(this.env.OMNIO_STORAGE_ROOT, constants.W_OK);
      return "healthy";
    } catch {
      return "offline";
    }
  }

  @Get("healthz")
  liveness(): { status: "ok" } {
    return { status: "ok" };
  }

  @Get("readyz")
  async readiness(): Promise<{ status: "ok"; deps: Record<string, DependencyStatus> }> {
    const [postgres, redis] = await Promise.all([this.checkPostgres(), this.checkRedis()]);
    const deps = { postgres, redis };
    if (postgres === "down" || redis === "down") {
      throw new ServiceUnavailableException({ status: "unavailable", deps });
    }
    return { status: "ok", deps };
  }

  private async checkPostgres(): Promise<DependencyStatus> {
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      return "up";
    } catch {
      return "down";
    }
  }

  private async checkRedis(): Promise<DependencyStatus> {
    try {
      return (await this.redis.ping()) === "PONG" ? "up" : "down";
    } catch {
      return "down";
    }
  }
}
