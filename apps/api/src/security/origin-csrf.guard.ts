import type { CanActivate, ExecutionContext } from "@nestjs/common";
import { ForbiddenException, Inject, Injectable } from "@nestjs/common";
import type { Request } from "express";
import { OMNIO_ENV } from "../config/config.module";
import type { Env } from "../env";

const SAFE_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);

/**
 * Same-origin enforcement for state-changing requests (docs/architecture/06-security.md §4).
 * Combined with SameSite=Lax cookies this defeats CSRF without a token dance:
 * a mutation must carry an Origin matching the host or an allow-listed origin.
 */
@Injectable()
export class OriginCsrfGuard implements CanActivate {
  private readonly allowed: Set<string>;

  constructor(@Inject(OMNIO_ENV) env: Env) {
    this.allowed = new Set(env.OMNIO_ALLOWED_ORIGINS);
  }

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<Request>();
    if (SAFE_METHODS.has(request.method)) return true;

    const origin = request.headers.origin;
    if (!origin || !this.isTrusted(origin, request)) {
      throw new ForbiddenException({
        code: "cross_origin_denied",
        message: "Cross-origin request rejected.",
      });
    }
    return true;
  }

  private isTrusted(origin: string, request: Request): boolean {
    if (this.allowed.has(origin)) return true;
    const host = request.headers.host;
    if (!host) return false;
    try {
      return new URL(origin).host === host;
    } catch {
      return false;
    }
  }
}
