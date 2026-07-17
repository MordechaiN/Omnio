import type { CanActivate, ExecutionContext } from "@nestjs/common";
import { HttpException, HttpStatus, Injectable } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import type { Request, Response } from "express";
import { hashToken } from "../auth/credentials";
import { readSessionCookie } from "../auth/cookies";
import { RedisService } from "../infra/redis.service";
import { RATE_LIMIT_TIER, RATE_LIMIT_TIERS, type RateLimitTier } from "./rate-limit.decorator";

/** Probes must never be throttled — orchestrators poll them constantly. */
const EXEMPT_PATHS = new Set(["/healthz", "/readyz", "/metrics"]);

/**
 * Fixed-window rate limiter backed by Redis (INCR + EXPIRE). Fails open if
 * Redis is unreachable — availability of the app outranks the limiter, and the
 * readiness probe already surfaces a Redis outage.
 */
@Injectable()
export class RateLimitGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly redis: RedisService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();
    if (EXEMPT_PATHS.has(request.path)) return true;

    const tier =
      this.reflector.getAllAndOverride<RateLimitTier>(RATE_LIMIT_TIER, [
        context.getHandler(),
        context.getClass(),
      ]) ?? "read";
    const policy = RATE_LIMIT_TIERS[tier];

    const identity = this.identify(request);
    const window = Math.floor(Date.now() / 1000 / policy.windowSeconds);
    const key = `rl:${tier}:${identity}:${window}`;

    let count: number;
    try {
      count = await this.redis.client.incr(key);
      if (count === 1) {
        await this.redis.client.expire(key, policy.windowSeconds);
      }
    } catch {
      return true; // fail open
    }

    if (count > policy.limit) {
      const retryAfter =
        policy.windowSeconds - (Math.floor(Date.now() / 1000) % policy.windowSeconds);
      const response = context.switchToHttp().getResponse<Response>();
      response.setHeader("Retry-After", String(retryAfter));
      throw new HttpException(
        { code: "rate_limited", message: "Too many requests. Try again shortly." },
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }
    return true;
  }

  private identify(request: Request): string {
    const token = readSessionCookie(request.headers.cookie);
    if (token) return `s:${hashToken(token).slice(0, 32)}`;
    return `ip:${request.ip ?? "unknown"}`;
  }
}
