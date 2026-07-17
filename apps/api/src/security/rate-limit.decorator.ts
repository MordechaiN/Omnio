import { SetMetadata } from "@nestjs/common";

export interface RateLimitPolicy {
  limit: number;
  windowSeconds: number;
}

/**
 * Tiered limits (docs/architecture/06-security.md §4): auth strictest, then
 * mutations/job creation, then reads. Counters are Redis-backed and keyed per
 * session (or per IP when unauthenticated).
 */
export const RATE_LIMIT_TIERS = {
  auth: { limit: 10, windowSeconds: 60 },
  mutation: { limit: 60, windowSeconds: 60 },
  read: { limit: 300, windowSeconds: 60 },
} as const satisfies Record<string, RateLimitPolicy>;

export type RateLimitTier = keyof typeof RATE_LIMIT_TIERS;

export const RATE_LIMIT_TIER = "omnio:rateLimitTier";

/** Override a route's rate-limit tier. Undecorated routes use `read`. */
export const RateLimit = (tier: RateLimitTier): MethodDecorator & ClassDecorator =>
  SetMetadata(RATE_LIMIT_TIER, tier);
