import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { dirname, join } from "node:path";
import type { ModuleSource, ValidationContext } from "./validate";

const SURFACE_CANDIDATES = ["", ".tsx", ".ts", "/index.tsx", "/index.ts"];

/** Walk up from `start` to the repo root (the dir with pnpm-workspace.yaml). */
export function findRepoRoot(start: string): string {
  let dir = start;
  for (;;) {
    if (existsSync(join(dir, "pnpm-workspace.yaml"))) return dir;
    const parent = dirname(dir);
    if (parent === dir) throw new Error("Could not locate the repo root (pnpm-workspace.yaml).");
    dir = parent;
  }
}

export function discoverModuleSources(modulesRoot: string): ModuleSource[] {
  if (!existsSync(modulesRoot)) return [];
  return readdirSync(modulesRoot)
    .filter((name) => {
      const dir = join(modulesRoot, name);
      return statSync(dir).isDirectory() && existsSync(join(dir, "module.json"));
    })
    .map((dir) => ({
      dir,
      manifest: JSON.parse(readFileSync(join(modulesRoot, dir, "module.json"), "utf8")) as unknown,
    }));
}

export function createFsContext(
  modulesRoot: string,
  categoryIds: readonly string[],
): ValidationContext {
  return {
    categoryIds,
    surfaceExists: (moduleDir, surface) => {
      const base = join(modulesRoot, moduleDir, surface);
      return SURFACE_CANDIDATES.some((suffix) => existsSync(base + suffix));
    },
    loadCatalog: (moduleDir, locale) => {
      const file = join(modulesRoot, moduleDir, "i18n", `${locale}.json`);
      if (!existsSync(file)) return null;
      return JSON.parse(readFileSync(file, "utf8")) as Record<string, unknown>;
    },
  };
}
