import { parseManifest, type ModuleManifest } from "@omnio/module-sdk";

export interface ModuleSource {
  /** Directory name under packages/modules (also the expected module id). */
  dir: string;
  manifest: unknown;
}

export interface LoadedModule {
  dir: string;
  manifest: ModuleManifest;
}

export interface ValidationContext {
  categoryIds: readonly string[];
  /** Does the tool surface resolve to a real file? */
  surfaceExists: (moduleDir: string, surface: string) => boolean;
  /** Load a module i18n catalog, or null if absent. */
  loadCatalog: (moduleDir: string, locale: "en" | "he") => Record<string, unknown> | null;
}

export interface ModgenError {
  module: string;
  message: string;
}

const LOCALES = ["en", "he"] as const;

function flattenKeys(value: Record<string, unknown>, prefix = ""): Set<string> {
  const keys = new Set<string>();
  for (const [key, child] of Object.entries(value)) {
    const path = prefix ? `${prefix}.${key}` : key;
    if (child && typeof child === "object" && !Array.isArray(child)) {
      for (const nested of flattenKeys(child as Record<string, unknown>, path)) keys.add(nested);
    } else {
      keys.add(path);
    }
  }
  return keys;
}

function requiredI18nKeys(manifest: ModuleManifest): string[] {
  const keys = ["name", "description"];
  for (const tool of manifest.tools) {
    keys.push(`tools.${tool.id}.name`, `tools.${tool.id}.description`);
  }
  return keys;
}

/**
 * Validate every discovered module. Manifest-shape errors come from the SDK
 * schema; modgen adds category membership, dead-surface, and i18n
 * completeness/parity checks. Every error names the module and the fix.
 */
export function validateModules(
  sources: ModuleSource[],
  ctx: ValidationContext,
): { modules: LoadedModule[]; errors: ModgenError[] } {
  const errors: ModgenError[] = [];
  const modules: LoadedModule[] = [];
  const seenModuleIds = new Map<string, string>();

  for (const source of sources) {
    const parsed = parseManifest(source.manifest);
    if (!parsed.success) {
      for (const issue of parsed.error.issues) {
        errors.push({
          module: source.dir,
          message: `${issue.path.join(".") || "(root)"}: ${issue.message}`,
        });
      }
      continue;
    }
    const manifest = parsed.data;

    if (manifest.id !== source.dir) {
      errors.push({
        module: source.dir,
        message: `module id "${manifest.id}" must equal its folder name "${source.dir}".`,
      });
    }

    if (!ctx.categoryIds.includes(manifest.category)) {
      errors.push({
        module: source.dir,
        message: `unknown category "${manifest.category}" (expected one of ${ctx.categoryIds.join(", ")}).`,
      });
    }

    const previous = seenModuleIds.get(manifest.id);
    if (previous) {
      errors.push({
        module: source.dir,
        message: `duplicate module id "${manifest.id}" (also declared in ${previous}).`,
      });
    }
    seenModuleIds.set(manifest.id, source.dir);

    for (const tool of manifest.tools) {
      if (!ctx.surfaceExists(source.dir, tool.surface)) {
        errors.push({
          module: source.dir,
          message: `tool "${tool.id}" points at a missing surface: ${tool.surface}`,
        });
      }
    }

    const required = requiredI18nKeys(manifest);
    const catalogs = {
      en: ctx.loadCatalog(source.dir, "en"),
      he: ctx.loadCatalog(source.dir, "he"),
    };
    for (const locale of LOCALES) {
      const catalog = catalogs[locale];
      if (!catalog) {
        errors.push({ module: source.dir, message: `missing i18n catalog i18n/${locale}.json.` });
        continue;
      }
      const present = flattenKeys(catalog);
      for (const key of required) {
        if (!present.has(key)) {
          errors.push({
            module: source.dir,
            message: `i18n/${locale}.json is missing key "${key}".`,
          });
        }
      }
    }
    if (catalogs.en && catalogs.he) {
      const en = flattenKeys(catalogs.en);
      const he = flattenKeys(catalogs.he);
      for (const key of en) {
        if (!he.has(key)) {
          errors.push({
            module: source.dir,
            message: `i18n key "${key}" is in en but missing from he.`,
          });
        }
      }
      for (const key of he) {
        if (!en.has(key)) {
          errors.push({
            module: source.dir,
            message: `i18n key "${key}" is in he but missing from en.`,
          });
        }
      }
    }

    modules.push({ dir: source.dir, manifest });
  }

  return { modules, errors };
}
