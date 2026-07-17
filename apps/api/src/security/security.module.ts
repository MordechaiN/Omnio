import { Module } from "@nestjs/common";
import { APP_GUARD } from "@nestjs/core";
import { OriginCsrfGuard } from "./origin-csrf.guard";
import { RateLimitGuard } from "./rate-limit.guard";

/**
 * Cross-cutting request security: CSRF origin enforcement and Redis-backed
 * tiered rate limiting, both applied as global guards.
 */
@Module({
  providers: [
    { provide: APP_GUARD, useClass: OriginCsrfGuard },
    { provide: APP_GUARD, useClass: RateLimitGuard },
  ],
})
export class SecurityModule {}
