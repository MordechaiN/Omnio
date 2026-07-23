import { omnio } from "@omnio/config/eslint";

export default [
  ...omnio(),
  // public/ holds vendored, same-origin runtime assets (e.g. the tesseract OCR
  // worker/core), not source; scripts/ are Node build helpers.
  { ignores: ["next-env.d.ts", "public/**", "scripts/**"] },
];
