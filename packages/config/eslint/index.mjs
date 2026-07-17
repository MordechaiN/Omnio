import js from "@eslint/js";
import tseslint from "typescript-eslint";
import prettier from "eslint-config-prettier";
import noPhysicalDirectionClasses from "./no-physical-direction-classes.mjs";

/**
 * Shared ESLint flat config for every Omnio workspace.
 * Type-aware analysis is tsc's job (turbo typecheck); lint stays fast.
 */
export function omnio() {
  return tseslint.config(
    {
      ignores: [
        "dist/**",
        ".next/**",
        ".turbo/**",
        "coverage/**",
        "node_modules/**",
        "**/generated/**",
      ],
    },
    js.configs.recommended,
    ...tseslint.configs.recommended,
    prettier,
    {
      plugins: {
        omnio: {
          rules: { "no-physical-direction-classes": noPhysicalDirectionClasses },
        },
      },
      rules: {
        "omnio/no-physical-direction-classes": "error",

        // Import boundaries (docs/architecture/02-monorepo.md §2):
        // modules never import apps or each other; features never live in apps.
        "no-restricted-imports": [
          "error",
          {
            patterns: [
              {
                group: ["apps/*", "@omnio/web*", "@omnio/api*", "@omnio/worker*"],
                message:
                  "Packages must not import from apps — apps are wiring, packages are features (docs/architecture/02-monorepo.md §2).",
              },
              {
                group: ["@omnio/mod-*"],
                message:
                  "Modules must not import each other. Shared logic graduates into @omnio/core, @omnio/ui, or @omnio/module-sdk.",
              },
            ],
          },
        ],

        // child_process is only reachable through ctx.exec() in the worker
        // sandbox (docs/architecture/06-security.md §2). The worker app itself
        // re-enables this locally where the wrapper is implemented.
        "no-restricted-modules": "off",
        // Logs go through the structured logger (pino, M3) — stray console
        // output is invisible to operators and fails lint.
        "no-console": "error",
        "@typescript-eslint/no-unused-vars": [
          "error",
          { argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
        ],
        "@typescript-eslint/consistent-type-imports": "error",
      },
    },
  );
}
