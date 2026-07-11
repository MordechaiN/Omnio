import { Controller, Get } from "@nestjs/common";

/**
 * Container orchestration endpoints — intentionally outside the public
 * ts-rest contract; they belong to the deployment, not the product API.
 */
@Controller()
export class HealthController {
  @Get("healthz")
  liveness(): { status: "ok" } {
    return { status: "ok" };
  }

  @Get("readyz")
  readiness(): { status: "ok" } {
    // M3 adds dependency pings (postgres, redis) here; with no
    // dependencies wired yet, ready === alive.
    return { status: "ok" };
  }
}
