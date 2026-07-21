"use client";

import createQpdf, { type QpdfInstance } from "@neslinesli93/qpdf-wasm";

/**
 * qpdf compiled to WebAssembly — real 256-bit AES encryption/decryption and
 * stream optimization that pdf-lib can't do, running entirely in the browser.
 * The 1.3 MB .wasm is emitted as a same-origin asset by webpack (no CDN) and
 * only loaded when one of these tools runs. A fresh instance is created per
 * operation: Emscripten's callMain exits the runtime, so reusing an instance
 * across operations is unsafe.
 */
interface QpdfFsWritable extends QpdfInstance {
  FS: QpdfInstance["FS"] & {
    writeFile: (path: string, data: Uint8Array) => void;
    unlink: (path: string) => void;
  };
}

export async function runQpdf(input: Uint8Array, buildArgs: (inPath: string, outPath: string) => string[]): Promise<Uint8Array> {
  const wasmUrl = new URL("@neslinesli93/qpdf-wasm/dist/qpdf.wasm", import.meta.url).toString();
  const qpdf = (await createQpdf({ locateFile: () => wasmUrl })) as QpdfFsWritable;
  const inPath = "/input.pdf";
  const outPath = "/output.pdf";
  qpdf.FS.writeFile(inPath, input);
  const code = qpdf.callMain(buildArgs(inPath, outPath));
  if (code !== 0) throw new Error(`qpdf exited with ${code}`);
  const output = qpdf.FS.readFile(outPath);
  return output;
}
