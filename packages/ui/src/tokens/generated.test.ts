import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { buildTokensCss } from "./build.ts";

describe("generated tokens.css", () => {
  it("is in sync with tokens.ts (run `pnpm --filter @omnio/ui gen:tokens` if this fails)", () => {
    const here = dirname(fileURLToPath(import.meta.url));
    const committed = readFileSync(join(here, "..", "styles", "tokens.css"), "utf8");
    expect(committed).toBe(buildTokensCss());
  });
});
