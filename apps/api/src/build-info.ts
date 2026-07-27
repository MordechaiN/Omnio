import { readFileSync } from "node:fs";
import { arch, hostname, release, type as osType } from "node:os";
import { join } from "node:path";
import type { Env } from "./env";

/**
 * The canonical release manifest for the running api.
 *
 * Build-time-immutable fields come from `release.json` — generated during the
 * build (tooling/release/gen-manifest.mjs) and baked into the image, never
 * hand-maintained (docs/architecture/09-releases.md). Runtime fields (hostname,
 * os/arch, node, redis version, environment, mode) are gathered live so the
 * manifest always describes *this* deployment. Served whole at GET /api/version.
 */
export type ReleaseChannel = "alpha" | "beta" | "rc" | "stable";

export interface ReleaseManifest {
  version: string;
  channel: ReleaseChannel;
  commit: string;
  branch: string;
  buildNumber: string;
  buildTimestamp: string;
  environment: string;
  mode: string;
  dockerImages: string[];
  hostname: string;
  os: string;
  arch: string;
  node: string;
  pnpm: string;
  database: string;
  redis: string | null;
}

/** Compiled-in fallback version; the release tooling sets OMNIO_VERSION. */
export const OMNIO_VERSION = "0.1.0-alpha.1";

const UNKNOWN = "unknown";

export function channelOf(version: string): ReleaseChannel {
  const pre = version.split("-")[1] ?? "";
  if (pre.startsWith("alpha")) return "alpha";
  if (pre.startsWith("beta")) return "beta";
  if (pre.startsWith("rc")) return "rc";
  // A build with no release metadata (someone cloned the repo and built it) has
  // no prerelease tag, and used to fall through to "stable" — an unreleased
  // product announcing itself as stable. It is at most as finished as the
  // release it was built from.
  if (pre.startsWith("source") || version.startsWith("0.0.0")) return "alpha";
  return "stable";
}

type StaticManifest = Partial<
  Pick<
    ReleaseManifest,
    | "version"
    | "channel"
    | "commit"
    | "branch"
    | "buildNumber"
    | "buildTimestamp"
    | "dockerImages"
    | "pnpm"
    | "database"
  >
>;

/** Prefer the baked release.json; fall back to individual build-arg env vars. */
function readStatic(source: NodeJS.ProcessEnv): StaticManifest {
  try {
    return JSON.parse(readFileSync(join(process.cwd(), "release.json"), "utf8")) as StaticManifest;
  } catch {
    return {
      version: source.OMNIO_VERSION,
      commit: source.OMNIO_GIT_COMMIT,
      branch: source.OMNIO_GIT_BRANCH,
      buildNumber: source.OMNIO_BUILD_NUMBER,
      buildTimestamp: source.OMNIO_BUILD_DATE,
    };
  }
}

export function readManifest(
  env: Env,
  opts: { redis?: string | null } = {},
  source: NodeJS.ProcessEnv = process.env,
): ReleaseManifest {
  const s = readStatic(source);
  const version = s.version ?? source.OMNIO_VERSION ?? OMNIO_VERSION;
  return {
    version,
    channel: s.channel ?? channelOf(version),
    commit: s.commit ?? UNKNOWN,
    branch: s.branch ?? UNKNOWN,
    buildNumber: s.buildNumber ?? UNKNOWN,
    buildTimestamp: s.buildTimestamp ?? UNKNOWN,
    environment: env.OMNIO_ENVIRONMENT ?? env.NODE_ENV,
    mode: env.OMNIO_MODE,
    dockerImages: s.dockerImages ?? [],
    hostname: hostname(),
    os: `${osType()} ${release()}`,
    arch: arch(),
    node: process.version,
    pnpm: s.pnpm ?? UNKNOWN,
    database: s.database ?? "postgresql",
    redis: opts.redis ?? null,
  };
}
