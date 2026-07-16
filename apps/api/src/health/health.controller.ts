import { Controller, Get, ServiceUnavailableException } from "@nestjs/common";
import { Public } from "../auth/public.decorator";
import { PrismaService } from "../infra/prisma.service";
import { RedisService } from "../infra/redis.service";

type DependencyStatus = "up" | "down";

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
  ) {}

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
