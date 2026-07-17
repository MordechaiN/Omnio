#!/usr/bin/env node
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { CATEGORY_IDS } from "@omnio/core";
import {
  catalog,
  eslintConfig,
  manifestJson,
  packageJson,
  sharedTestTs,
  sharedTs,
  surfaceTsx,
  toolCatalogEntry,
  tsconfigJson,
  type ModuleTemplateOptions,
} from "./templates.js";

const KEBAB = /^[a-z][a-z0-9]*(?:-[a-z0-9]+)*$/;

function findRepoRoot(start: string): string {
  let dir = start;
  for (;;) {
    if (existsSync(join(dir, "pnpm-workspace.yaml"))) return dir;
    const parent = dirname(dir);
    if (parent === dir) throw new Error("Could not locate the repo root.");
    dir = parent;
  }
}

function fail(message: string): never {
  process.stderr.write(`scaffold: ${message}\n`);
  process.exit(1);
}

function flag(args: string[], name: string): string | undefined {
  const index = args.indexOf(`--${name}`);
  return index >= 0 ? args[index + 1] : undefined;
}

function write(path: string, content: string): void {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, content);
  process.stdout.write(`  + ${path}\n`);
}

function nextSteps(): void {
  process.stdout.write("\nNext: pnpm install && pnpm modgen, then pnpm dev.\n");
}

function scaffoldModule(root: string, args: string[]): void {
  const id = args[0];
  if (!id || !KEBAB.test(id)) fail("usage: new:module <kebab-id> [--category <c>] [--tool <t>]");
  const category = flag(args, "category") ?? "utilities";
  const toolId = flag(args, "tool") ?? id;
  if (!CATEGORY_IDS.includes(category as (typeof CATEGORY_IDS)[number])) {
    fail(`unknown category "${category}" (one of: ${CATEGORY_IDS.join(", ")}).`);
  }
  if (!KEBAB.test(toolId)) fail(`tool id "${toolId}" must be kebab-case.`);

  const dir = join(root, "packages", "modules", id);
  if (existsSync(dir)) fail(`packages/modules/${id} already exists.`);

  const o: ModuleTemplateOptions = { id, category, toolId };
  write(join(dir, "module.json"), manifestJson(o));
  write(join(dir, "package.json"), packageJson(o));
  write(join(dir, "tsconfig.json"), tsconfigJson());
  write(join(dir, "eslint.config.mjs"), eslintConfig());
  write(join(dir, `frontend/tools/${toolId}.tsx`), surfaceTsx(o));
  write(join(dir, `shared/${toolId}.ts`), sharedTs());
  write(join(dir, `shared/${toolId}.test.ts`), sharedTestTs(o));
  write(join(dir, "i18n/en.json"), catalog(o, "en"));
  write(join(dir, "i18n/he.json"), catalog(o, "he"));
  nextSteps();
}

interface Manifest {
  id: string;
  tools: { id: string; tier: string; surface: string; keywords?: string[] }[];
}

function scaffoldTool(root: string, args: string[]): void {
  const [moduleId, toolId] = args;
  if (!moduleId || !toolId || !KEBAB.test(toolId))
    fail("usage: new:tool <moduleId> <kebab-toolId>");

  const dir = join(root, "packages", "modules", moduleId);
  const manifestPath = join(dir, "module.json");
  if (!existsSync(manifestPath)) fail(`module "${moduleId}" not found.`);

  const manifest = JSON.parse(readFileSync(manifestPath, "utf8")) as Manifest;
  if (manifest.tools.some((tool) => tool.id === toolId)) {
    fail(`tool "${toolId}" already exists in "${moduleId}".`);
  }
  manifest.tools.push({
    id: toolId,
    tier: "browser",
    surface: `frontend/tools/${toolId}`,
    keywords: [],
  });
  writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
  process.stdout.write(`  ~ ${manifestPath}\n`);

  const o: ModuleTemplateOptions = { id: moduleId, category: "", toolId };
  write(join(dir, `frontend/tools/${toolId}.tsx`), surfaceTsx(o));
  write(join(dir, `shared/${toolId}.ts`), sharedTs());
  write(join(dir, `shared/${toolId}.test.ts`), sharedTestTs(o));

  for (const locale of ["en", "he"] as const) {
    const path = join(dir, "i18n", `${locale}.json`);
    const cat = JSON.parse(readFileSync(path, "utf8")) as {
      tools: Record<string, unknown>;
    };
    cat.tools[toolId] = toolCatalogEntry(toolId);
    writeFileSync(path, `${JSON.stringify(cat, null, 2)}\n`);
    process.stdout.write(`  ~ ${path}\n`);
  }
  nextSteps();
}

const [command, ...rest] = process.argv.slice(2);
const root = findRepoRoot(process.cwd());

if (command === "module") scaffoldModule(root, rest);
else if (command === "tool") scaffoldTool(root, rest);
else fail("usage: omnio-scaffold <module|tool> …");
