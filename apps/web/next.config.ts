import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";
import { MODULE_PACKAGES } from "./src/generated/modules";

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

/**
 * Baseline response hardening for the web tier (docs/architecture/06-security.md §4).
 * `frame-ancestors 'none'` blocks clickjacking without touching resource loading;
 * the full nonce-based script CSP is tracked as web-shell debt (docs/TECH_DEBT.md).
 */
/**
 * Content-Security-Policy.
 *
 * Omnio holds people's contracts and passport scans in OPFS on this origin, so
 * script running here can read all of it. The policy previously said only
 * `frame-ancestors 'none'` — clickjacking cover, and nothing about what may
 * load or execute.
 *
 * `script-src` still carries `unsafe-inline` and `unsafe-eval`: Next's bootstrap
 * is inline, and the on-device engines (tesseract, mupdf, pdf.js) are WebAssembly.
 * Removing those needs the nonce work already tracked in docs/TECH_DEBT.md, and
 * pretending otherwise would be theatre. What *is* new is everything around it —
 * a default that denies, no plugins, no base-tag hijack, no cross-origin form
 * post — each of which closes a real path without costing a feature.
 *
 * Allowances are deliberate, not generous: `blob:` because every preview,
 * thumbnail and download is an object URL; `worker-src blob:` because pdf.js and
 * tesseract run in workers; `frame-src` for the HTML preview's sandboxed iframe.
 */
const API_ORIGIN = (() => {
  try {
    return new URL(process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000").origin;
  } catch {
    return "";
  }
})();

const CSP = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline' 'unsafe-eval' 'wasm-unsafe-eval' blob:",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' blob: data:",
  "media-src 'self' blob:",
  "font-src 'self'",
  "worker-src 'self' blob:",
  "child-src 'self' blob:",
  "frame-src 'self' blob:",
  `connect-src 'self' blob: data:${API_ORIGIN ? ` ${API_ORIGIN}` : ""}`,
  // Nothing here needs plugins, a rewritten base URL, or an off-site form post.
  "object-src 'none'",
  "base-uri 'none'",
  "form-action 'self'",
  "frame-ancestors 'none'",
].join("; ");

const SECURITY_HEADERS = [
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "no-referrer" },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(), browsing-topics=()",
  },
  { key: "Content-Security-Policy", value: CSP },
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
  // The qpdf-wasm and mupdf-wasm Emscripten glue reference node core modules
  // (`fs`, `path`, `crypto`, `module`) behind runtime checks that never fire in
  // the browser. mupdf imports them `node:`-prefixed, which webpack won't route
  // through `resolve.fallback` on its own, so first strip the `node:` scheme,
  // then stub the bare names to `false`. The .wasm files themselves load as
  // same-origin assets via `new URL(..., import.meta.url)`.
  webpack(
    config: {
      resolve?: { fallback?: Record<string, unknown> };
      plugins?: unknown[];
    },
    { webpack }: {
      webpack: {
        NormalModuleReplacementPlugin: new (
          pattern: RegExp,
          handler: (resource: { request: string }) => void,
        ) => unknown;
      };
    },
  ) {
    config.resolve = config.resolve ?? {};
    config.resolve.fallback = {
      ...config.resolve.fallback,
      fs: false,
      path: false,
      crypto: false,
      module: false,
    };
    config.plugins = config.plugins ?? [];
    config.plugins.push(
      new webpack.NormalModuleReplacementPlugin(/^node:/, (resource: { request: string }) => {
        resource.request = resource.request.replace(/^node:/, "");
      }),
    );
    return config;
  },
};

export default withNextIntl(nextConfig);
