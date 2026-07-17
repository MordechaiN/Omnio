import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";
import { MODULE_PACKAGES } from "./src/generated/modules";

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

const nextConfig: NextConfig = {
  // Security headers and CSP land in M3 alongside the API hardening pass
  // (docs/architecture/06-security.md §4) — tracked, not forgotten.
  poweredByHeader: false,
  reactStrictMode: true,
  // @omnio/ui and every module ship TypeScript source (docs/architecture/02-monorepo.md).
  // MODULE_PACKAGES is modgen-generated so new modules transpile with zero config edits.
  transpilePackages: ["@omnio/ui", ...MODULE_PACKAGES],
  // Linting is a first-class turbo task with the shared config;
  // next build must not run a second, differently-configured pass.
  eslint: { ignoreDuringBuilds: true },
};

export default withNextIntl(nextConfig);
