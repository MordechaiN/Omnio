import { defineConfig } from "vitest/config";

/**
 * Integration tests (Testcontainers) live outside `src` so the default unit
 * suite stays fast and Docker-free. They run via `pnpm test:integration` and in
 * the dedicated CI job; without a Docker daemon they skip themselves.
 */
export default defineConfig({
  test: {
    include: ["test/**/*.integration.test.ts"],
    testTimeout: 120_000,
    hookTimeout: 180_000,
  },
});
