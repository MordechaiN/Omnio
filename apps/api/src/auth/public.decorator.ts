import { SetMetadata } from "@nestjs/common";

export const IS_PUBLIC = "omnio:isPublic";

/**
 * Opt a route out of the global {@link SessionGuard}. The default is
 * authenticated — there are no unauthenticated mutating routes
 * (docs/architecture/06-security.md §1).
 */
export const Public = (): MethodDecorator & ClassDecorator => SetMetadata(IS_PUBLIC, true);
