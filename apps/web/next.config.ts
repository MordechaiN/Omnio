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
  // Linting is a first-class turbo task with the shared config;
  // next build must not run a second, differently-configured pass.
  eslint: { ignoreDuringBuilds: true },
};

export default withNextIntl(nextConfig);
