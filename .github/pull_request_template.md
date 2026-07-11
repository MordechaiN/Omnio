## What

<!-- One or two sentences: what does this PR do? -->

## Why

<!-- Link the issue, or explain the motivation. -->

## How

<!-- Anything a reviewer should know about the approach. Screenshots for UI changes — light AND dark, LTR AND RTL where relevant. -->

## Checklist

- [ ] Builds, lints, typechecks, and tests pass locally (`pnpm build && pnpm lint && pnpm typecheck && pnpm test`)
- [ ] New user-facing strings have both `en` and `he` translations
- [ ] No physical direction CSS (logical properties only)
- [ ] Follows the module boundaries (features in `packages/modules/*`, no cross-module imports)
- [ ] Docs updated where behavior changed
