#!/usr/bin/env node
/**
 * Compute build & release metadata from git + the root package.json.
 *
 * The single source of these values (docs/architecture/09-releases.md §2). The
 * version comes from package.json; everything else from git. Run at build time
 * on the host — `.git` is excluded from the Docker context, so these must be
 * passed into the image as build args.
 *
 * Usage:
 *   node tooling/release/build-metadata.mjs            # KEY=VALUE lines
 *   node tooling/release/build-metadata.mjs --export   # `export KEY=VALUE` (eval)
 *   node tooling/release/build-metadata.mjs --json      # JSON object
 */
import { execSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), "..", "..");

function git(args, fallback) {
  try {
    return execSync(`git ${args}`, { cwd: repoRoot, stdio: ["ignore", "pipe", "ignore"] })
      .toString()
      .trim();
  } catch {
    return fallback;
  }
}

const version = JSON.parse(readFileSync(join(repoRoot, "package.json"), "utf8")).version;

const metadata = {
  OMNIO_VERSION: version,
  OMNIO_GIT_COMMIT: git("rev-parse --short HEAD", "unknown"),
  OMNIO_GIT_BRANCH: git("rev-parse --abbrev-ref HEAD", "unknown"),
  OMNIO_BUILD_DATE: new Date().toISOString(),
  OMNIO_BUILD_NUMBER: process.env.BUILD_NUMBER ?? git("rev-list --count HEAD", "0"),
};

const mode = process.argv[2] ?? "";
if (mode === "--json") {
  process.stdout.write(`${JSON.stringify(metadata, null, 2)}\n`);
} else {
  const prefix = mode === "--export" ? "export " : "";
  for (const [key, value] of Object.entries(metadata)) {
    process.stdout.write(`${prefix}${key}=${value}\n`);
  }
}
