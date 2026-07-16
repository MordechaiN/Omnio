import { createParamDecorator, type ExecutionContext } from "@nestjs/common";
import type { AuthedRequest, AuthedUser } from "./types";

/**
 * Injects the identity the {@link SessionGuard} attached. Only valid on
 * guarded (non-public) routes, where the guard guarantees it is present.
 */
export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): AuthedUser => {
    const request = ctx.switchToHttp().getRequest<AuthedRequest>();
    if (!request.omnioUser) {
      throw new Error("CurrentUser used on a route without SessionGuard.");
    }
    return request.omnioUser;
  },
);
