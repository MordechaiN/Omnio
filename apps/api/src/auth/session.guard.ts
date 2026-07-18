import type { CanActivate, ExecutionContext } from "@nestjs/common";
import { Injectable, UnauthorizedException } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { AuthService } from "./auth.service";
import { readSessionCookie } from "./cookies";
import { IS_PUBLIC } from "./public.decorator";
import type { AuthedRequest } from "./types";

/**
 * Global guard: every route is authenticated unless marked {@link Public}.
 * In personal mode (`OMNIO_MODE=personal`) it attaches the singleton system
 * user so downstream ownership still resolves (docs/architecture/06-security.md §1, §4).
 */
@Injectable()
export class SessionGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly auth: AuthService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;

    const request = context.switchToHttp().getRequest<AuthedRequest>();

    if (!this.auth.isEnabled) {
      request.omnioUser = await this.auth.systemUser();
      return true;
    }

    const token = readSessionCookie(request.headers.cookie);
    const user = token ? await this.auth.resolveSession(token) : null;
    if (!user) {
      throw new UnauthorizedException({
        code: "unauthenticated",
        message: "Authentication required.",
      });
    }
    request.omnioUser = user;
    return true;
  }
}
