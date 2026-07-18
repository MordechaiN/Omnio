import type { Env } from "./env";

/**
 * Build & deployment metadata for the running api.
 *
 * The immutable per-build fields (version, commit, branch, buildDate,
 * buildNumber) are injected as plain environment variables by the release
 * tooling — baked into the image as Docker `ENV` from build `ARG`s, never
 * hand-maintained (docs/architecture/09-releases.md). The runtime-varying
 * fields (environment, mode) come from the validated config so they always
 * describe *this* deployment, not the moment the image was built.
 */
export interface BuildInfo {
  version: string;
  commit: string;
  branch: string;
  buildDate: string;
  buildNumber: string;
  environment: string;
  mode: string;
}

/** Compiled-in fallback version; the release tooling sets OMNIO_VERSION. */
export const OMNIO_VERSION = "0.1.0-alpha.1";

const UNKNOWN = "unknown";

export function readBuildInfo(env: Env, source: NodeJS.ProcessEnv = process.env): BuildInfo {
  return {
    version: source.OMNIO_VERSION ?? OMNIO_VERSION,
    commit: source.OMNIO_GIT_COMMIT ?? UNKNOWN,
    branch: source.OMNIO_GIT_BRANCH ?? UNKNOWN,
    buildDate: source.OMNIO_BUILD_DATE ?? UNKNOWN,
    buildNumber: source.OMNIO_BUILD_NUMBER ?? UNKNOWN,
    environment: env.OMNIO_ENVIRONMENT ?? env.NODE_ENV,
    mode: env.OMNIO_MODE,
  };
}
