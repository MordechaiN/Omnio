export function toPascalCase(id: string): string {
  return id
    .split(/[-_]/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join("");
}

export interface ModuleTemplateOptions {
  id: string;
  category: string;
  toolId: string;
}

const HEADER = "AUTO-GENERATED scaffold — edit freely; this is your module now.";

export function manifestJson(o: ModuleTemplateOptions): string {
  return `${JSON.stringify(
    {
      $schema: "https://omnio.dev/schemas/module.v1.json",
      id: o.id,
      version: "1.0.0",
      category: o.category,
      icon: "wrench",
      i18nNamespace: `mod-${o.id}`,
      tools: [
        { id: o.toolId, tier: "browser", surface: `frontend/tools/${o.toolId}`, keywords: [] },
      ],
      capabilities: { fileActions: [] },
      permissions: [],
    },
    null,
    2,
  )}\n`;
}

export function packageJson(o: ModuleTemplateOptions): string {
  return `${JSON.stringify(
    {
      name: `@omnio/mod-${o.id}`,
      version: "1.0.0",
      private: true,
      license: "Apache-2.0",
      description: `${toPascalCase(o.id)} module. Ships TypeScript source; the web app transpiles it.`,
      type: "module",
      exports: {
        "./module.json": "./module.json",
        [`./frontend/tools/${o.toolId}`]: `./frontend/tools/${o.toolId}.tsx`,
        "./i18n/en": "./i18n/en.json",
        "./i18n/he": "./i18n/he.json",
      },
      scripts: { typecheck: "tsc --noEmit", lint: "eslint .", test: "vitest run" },
      dependencies: {
        "@omnio/module-sdk": "workspace:*",
        "@omnio/ui": "workspace:*",
        zod: "^3.25.0",
      },
      peerDependencies: { next: "^15.5.0", "next-intl": "^4.3.0", react: "^19.1.0" },
      devDependencies: {
        "@omnio/config": "workspace:*",
        "@types/react": "^19.1.0",
        eslint: "^9.30.0",
        next: "^15.5.0",
        "next-intl": "^4.3.0",
        react: "^19.1.0",
        typescript: "^5.8.0",
        vitest: "^3.2.0",
      },
    },
    null,
    2,
  )}\n`;
}

export function tsconfigJson(): string {
  return `{\n  "extends": "@omnio/config/tsconfig/react-library.json",\n  "include": ["frontend", "shared"]\n}\n`;
}

export function eslintConfig(): string {
  return `import { omnio } from "@omnio/config/eslint";\n\nexport default omnio();\n`;
}

export function surfaceTsx(o: ModuleTemplateOptions): string {
  const name = `${toPascalCase(o.toolId)}Tool`;
  return `"use client";

import { useTranslations } from "next-intl";
import { run } from "../../shared/${o.toolId}.ts";

// ${HEADER}
export default function ${name}() {
  const t = useTranslations("mod-${o.id}");
  return <p className="text-text-muted">{t("ui.placeholder", { result: run("world") })}</p>;
}
`;
}

export function sharedTs(): string {
  return `// ${HEADER}
/** Pure tool logic — testable in isolation, reused by the surface. */
export function run(input: string): string {
  return input.trim();
}
`;
}

export function sharedTestTs(o: ModuleTemplateOptions): string {
  return `import { describe, expect, it } from "vitest";
import { run } from "./${o.toolId}.ts";

describe("${o.toolId}", () => {
  it("trims its input", () => {
    expect(run("  hi  ")).toBe("hi");
  });
});
`;
}

export function catalog(o: ModuleTemplateOptions, _locale: "en" | "he"): string {
  const en = {
    name: toPascalCase(o.id),
    description: `TODO: describe the ${o.id} module.`,
    tools: {
      [o.toolId]: {
        name: toPascalCase(o.toolId),
        description: `TODO: describe the ${o.toolId} tool.`,
      },
    },
    ui: { placeholder: "TODO: build {result} into a real tool." },
  };
  // Hebrew starts as a copy so key parity holds; translate before shipping.
  return `${JSON.stringify(en, null, 2)}\n`;
}

export function toolCatalogEntry(toolId: string): { name: string; description: string } {
  return {
    name: toPascalCase(toolId),
    description: `TODO: describe the ${toolId} tool.`,
  };
}
