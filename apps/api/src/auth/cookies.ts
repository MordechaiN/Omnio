import { parse, serialize } from "cookie";

export const SESSION_COOKIE = "omnio_session";

interface CookieContext {
  /** Set the Secure flag — production only, so dev over http still works. */
  secure: boolean;
}

/** httpOnly + SameSite=Lax + Secure session cookie (docs/architecture/06-security.md §4). */
export function serializeSessionCookie(
  token: string,
  maxAgeSeconds: number,
  ctx: CookieContext,
): string {
  return serialize(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: ctx.secure,
    path: "/",
    maxAge: maxAgeSeconds,
  });
}

export function clearSessionCookie(ctx: CookieContext): string {
  return serialize(SESSION_COOKIE, "", {
    httpOnly: true,
    sameSite: "lax",
    secure: ctx.secure,
    path: "/",
    maxAge: 0,
  });
}

export function readSessionCookie(header: string | undefined): string | null {
  if (!header) return null;
  return parse(header)[SESSION_COOKIE] ?? null;
}
