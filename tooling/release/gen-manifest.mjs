#!/usr/bin/env node
/**
 * Generate the canonical release manifest (release.json) — the single source of
 * truth describing a build (docs/architecture/09-releases.md §2). Written
 * automatically during every build and committed to the repo; never hand-edited.
 *
 * Holds the build-time-immutable fields. The running api reads this file and
 * overlays the live runtime fields (hostname, os/arch, node, redis version,
 * environment, mode) before serving the *complete* manifest at GET /api/version.
 *
 * Values are read from the environment first (build args set as ENV during the
 * Docker build, where `.git` is unavailable), falling back to git + the root
 * package.json for host/dev runs.
 *
 * Usage:
 *   node tooling/release/gen-manifest.mjs            # write release.json at repo root
 *   node tooling/release/gen-manifest.mjs --stdout   # print to stdout instead
 */
import { execSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";
import { arch, platform, release, type as osType } from "node:os";
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

function tool(cmd, fallback) {
  try {
    return execSync(cmd, { stdio: ["ignore", "pipe", "ignore"] }).toString().trim();
  } catch {
    return fallback;
  }
}

const pkgVersion = JSON.parse(readFileSync(join(repoRoot, "package.json"), "utf8")).version;

/** alpha / beta / rc / stable from the SemVer pre-release tag. */
export function channelOf(version) {
  const pre = version.split("-")[1] ?? "";
  if (pre.startsWith("alpha")) return "alpha";
  if (pre.startsWith("beta")) return "beta";
  if (pre.startsWith("rc")) return "rc";
  return "stable";
}

const env = process.env;
const version = env.OMNIO_VERSION ?? pkgVersion;

const manifest = {
  version,
  channel: channelOf(version),
  commit: env.OMNIO_GIT_COMMIT ?? git("rev-parse --short HEAD", "unknown"),
  branch: env.OMNIO_GIT_BRANCH ?? git("rev-parse --abbrev-ref HEAD", "unknown"),
  buildNumber: env.OMNIO_BUILD_NUMBER ?? git("rev-list --count HEAD", "0"),
  buildTimestamp: env.OMNIO_BUILD_DATE ?? new Date().toISOString(),
  dockerImages: ["omnio-web", "omnio-api", "omnio-worker"].map((name) => `${name}:${version}`),
  node: process.version,
  pnpm: tool("pnpm --version", "unknown"),
  os: platform() === "linux" ? `${osType()} ${release()}` : platform(),
  arch: arch(),
  database: "postgresql",
};

const json = `${JSON.stringify(manifest, null, 2)}\n`;
if (process.argv[2] === "--stdout") {
  process.stdout.write(json);
} else {
  writeFileSync(join(repoRoot, "release.json"), json);
  process.stderr.write(`release.json written: v${manifest.version} (${manifest.commit})\n`);
}
