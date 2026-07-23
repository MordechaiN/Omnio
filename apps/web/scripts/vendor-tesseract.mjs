// Copy the tesseract.js worker, core WASM, and English language data into
// public/tesseract/ so OCR runs fully same-origin (no CDN) per the platform
// contract. Sourced from installed packages + the pdfkit module's vendored
// traineddata, so the output is reproducible and never hand-committed.
import { createRequire } from "node:module";
import { cpSync, mkdirSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";

const require = createRequire(import.meta.url);
const dest = new URL("../public/tesseract/", import.meta.url);
mkdirSync(dest, { recursive: true });

// tesseract.js is a dependency of the pdfkit module, not of web — anchor a
// resolver in the module's directory so pnpm resolves it correctly.
const pdfkitRoot = dirname(require.resolve("@omnio/mod-pdfkit/module.json"));
const modRequire = createRequire(join(pdfkitRoot, "package.json"));

// tesseract.js main resolves into src/; the worker ships in dist/.
const tjsRoot = dirname(dirname(modRequire.resolve("tesseract.js")));
cpSync(join(tjsRoot, "dist/worker.min.js"), new URL("worker.min.js", dest));

// tesseract.js-core is a dependency of tesseract.js; resolve its main from
// there and copy every core variant so the runtime can pick SIMD/LSTM per
// browser support (corePath points at this directory).
const coreRequire = createRequire(join(tjsRoot, "package.json"));
const coreDir = dirname(coreRequire.resolve("tesseract.js-core"));
for (const f of [
  "tesseract-core.wasm",
  "tesseract-core.wasm.js",
  "tesseract-core-lstm.wasm",
  "tesseract-core-lstm.wasm.js",
  "tesseract-core-simd.wasm",
  "tesseract-core-simd.wasm.js",
  "tesseract-core-simd-lstm.wasm",
  "tesseract-core-simd-lstm.wasm.js",
  "tesseract-core-relaxedsimd.wasm",
  "tesseract-core-relaxedsimd.wasm.js",
  "tesseract-core-relaxedsimd-lstm.wasm",
  "tesseract-core-relaxedsimd-lstm.wasm.js",
]) {
  const src = join(coreDir, f);
  if (existsSync(src)) cpSync(src, new URL(f, dest));
}

// English language data (vendored, gzipped) from the pdfkit module root.
cpSync(join(pdfkitRoot, "assets/tessdata/eng.traineddata.gz"), new URL("eng.traineddata.gz", dest));

console.log("vendored tesseract assets -> apps/web/public/tesseract/");
