import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";
import { MODULE_PACKAGES } from "./src/generated/modules";

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

/**
 * Baseline response hardening for the web tier (docs/architecture/06-security.md §4).
 * `frame-ancestors 'none'` blocks clickjacking without touching resource loading;
 * the full nonce-based script CSP is tracked as web-shell debt (docs/TECH_DEBT.md).
 */
const SECURITY_HEADERS = [
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "no-referrer" },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(), browsing-topics=()",
  },
  { key: "Content-Security-Policy", value: "frame-ancestors 'none'" },
  { key: "Strict-Transport-Security", value: "max-age=15552000; includeSubDomains" },
];

const nextConfig: NextConfig = {
  poweredByHeader: false,
  reactStrictMode: true,
  // Lean runtime image for docker/images/web.Dockerfile — copies only the
  // traced production server, not the full node_modules tree.
  output: "standalone",
  async headers() {
    return [{ source: "/:path*", headers: SECURITY_HEADERS }];
  },
  // @omnio/ui and every module ship TypeScript source (docs/architecture/02-monorepo.md).
  // MODULE_PACKAGES is modgen-generated so new modules transpile with zero config edits.
  transpilePackages: ["@omnio/ui", ...MODULE_PACKAGES],
  // The api is never exposed publicly (reference architecture: tunnel -> web only).
  // This server-side rewrite is web's own proxy to the internal api container, so
  // browser calls to same-origin /api/* still work without a separate reverse proxy.
  // Next.js resolves rewrites() at build time, not per-request, so this can't read
  // a runtime env var — "api" is the fixed compose service name regardless of env.
  async rewrites() {
    return [{ source: "/api/:path*", destination: "http://api:4000/api/:path*" }];
  },
  // Linting is a first-class turbo task with the shared config;
  // next build must not run a second, differently-configured pass.
  eslint: { ignoreDuringBuilds: true },
  // The qpdf-wasm Emscripten glue references node core modules (`fs`, `path`,
  // `crypto`) behind runtime typeof-checks that never fire in the browser.
  // Stub them for the client bundle so the static resolver doesn't choke; the
  // .wasm itself loads as a same-origin asset.
  webpack(config: { resolve?: { fallback?: Record<string, unknown> } }) {
    config.resolve = config.resolve ?? {};
    config.resolve.fallback = { ...config.resolve.fallback, fs: false, path: false, crypto: false };
    return config;
  },
};

export default withNextIntl(nextConfig);
