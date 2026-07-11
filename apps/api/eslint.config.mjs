import { omnio } from "@omnio/config/eslint";

export default [
  ...omnio(),
  {
    rules: {
      // Nest DI resolves constructor parameters from emitted decorator
      // metadata; converting an injected class to `import type` makes tsc
      // emit `Object` as the paramtype and silently breaks injection.
      "@typescript-eslint/consistent-type-imports": "off",
    },
  },
];
