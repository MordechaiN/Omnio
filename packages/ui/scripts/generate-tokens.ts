import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { buildTokensCss } from "../src/tokens/build.ts";

const here = dirname(fileURLToPath(import.meta.url));
const out = join(here, "..", "src", "styles", "tokens.css");
mkdirSync(dirname(out), { recursive: true });
writeFileSync(out, buildTokensCss());
process.stdout.write(`tokens.css written (${buildTokensCss().length} bytes)\n`);
