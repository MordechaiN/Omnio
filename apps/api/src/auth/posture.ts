import type { Env } from "../env";

const LOCAL_HOSTS = new Set(["127.0.0.1", "::1", "localhost"]);

/**
 * Enforce decision D2's escape hatch: `OMNIO_AUTH=none` is a trusted-LAN
 * convenience only. It refuses a non-local bind unless explicitly force-flagged,
 * and always warns loudly (docs/architecture/06-security.md §4).
 */
export function assertAuthPosture(
  env: Env,
  warn: (message: string) => void = (m) => process.stderr.write(`${m}\n`),
): void {
  if (env.OMNIO_AUTH !== "none") return;

  const local = LOCAL_HOSTS.has(env.OMNIO_API_HOST);
  if (!local && !env.OMNIO_AUTH_ALLOW_INSECURE) {
    throw new Error(
      `OMNIO_AUTH=none refuses a non-local bind (${env.OMNIO_API_HOST}). ` +
        "Set OMNIO_AUTH_ALLOW_INSECURE=true only if this instance is on a trusted network.",
    );
  }
  warn(
    "WARNING: OMNIO_AUTH=none — authentication is DISABLED. Anyone who can reach " +
      "this instance has full admin access. Do not expose it to untrusted networks.",
  );
}
