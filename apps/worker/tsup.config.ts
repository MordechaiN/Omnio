import { defineConfig } from "tsup";

/**
 * The worker bundles its own source plus the modules' worker-tier source (which
 * ships as TypeScript). Runtime libraries are left external and resolved from
 * node_modules; only workspace *source* packages are pulled in.
 */
export default defineConfig({
  entry: ["src/main.ts"],
  format: ["esm"],
  platform: "node",
  target: "node22",
  bundle: true,
  clean: true,
  sourcemap: true,
  // Modules ship TypeScript source — force-bundle them (tsup would otherwise
  // auto-externalize them as declared dependencies).
  noExternal: [/^@omnio\/mod-/],
  external: [
    "@omnio/db",
    "@omnio/jobs",
    "@omnio/storage",
    "@omnio/core",
    "@omnio/module-sdk",
    "bullmq",
    "ioredis",
    "pino",
    "zod",
  ],
});
