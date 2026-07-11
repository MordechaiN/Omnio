import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Security headers and CSP land in M3 alongside the API hardening pass
  // (docs/architecture/06-security.md §4) — tracked, not forgotten.
  poweredByHeader: false,
  reactStrictMode: true,
  // Linting is a first-class turbo task with the shared config;
  // next build must not run a second, differently-configured pass.
  eslint: { ignoreDuringBuilds: true },
};

export default nextConfig;
