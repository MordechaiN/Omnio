/**
 * Build & release metadata for the web tier.
 *
 * These come from `NEXT_PUBLIC_OMNIO_*` build args (docker/images/web.Dockerfile),
 * which Next.js inlines into the bundle at build time — so the footer and About
 * page read the exact build they are part of, with no runtime lookup. The
 * runtime-varying fields (deployment mode, environment, live build status) are
 * NOT here; the About page fetches those from `GET /api/version`, the source of
 * truth for the running deployment (docs/architecture/09-releases.md).
 */
export interface WebBuildInfo {
  version: string;
  commit: string;
  branch: string;
  buildDate: string;
  buildNumber: string;
}

// Must be referenced as full literal `process.env.NEXT_PUBLIC_*` keys for
// Next.js's static replacement to fire — do not build these names dynamically.
export const buildInfo: WebBuildInfo = {
  version: process.env.NEXT_PUBLIC_OMNIO_VERSION ?? "0.0.0-dev",
  commit: process.env.NEXT_PUBLIC_OMNIO_COMMIT ?? "unknown",
  branch: process.env.NEXT_PUBLIC_OMNIO_BRANCH ?? "unknown",
  buildDate: process.env.NEXT_PUBLIC_OMNIO_BUILD_DATE ?? "unknown",
  buildNumber: process.env.NEXT_PUBLIC_OMNIO_BUILD_NUMBER ?? "unknown",
};

/** The `v`-prefixed release string shown in the footer and titles. */
export const versionLabel = `v${buildInfo.version}`;

export const OMNIO_LICENSE = "Apache-2.0";
export const OMNIO_REPO_URL = "https://github.com/MordechaiN/Omnio";
export const OMNIO_DOCS_URL = "https://github.com/MordechaiN/Omnio/tree/main/docs";
