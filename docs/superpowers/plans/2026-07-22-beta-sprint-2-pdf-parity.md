# Beta Sprint 2 — PDF parity Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Close every BentoPDF workflow gap so Omnio can replace it, measured by workflows not tool count.

**Architecture:** New PDF tools follow the existing pdfkit pattern — a React client component under `frontend/tools/`, declared in `module.json` (`accepts`+`keywords` auto-wire the Universal Drop Zone, Smart Actions, and Search), with pure logic in `shared/` (unit-tested via vitest) and heavy engines lazy-loaded same-origin under `frontend/lib/`. Three new WASM engines (tesseract.js, mupdf, LibreOffice/zetajs) each pass a real-file feasibility spike before any tool is wired.

**Tech Stack:** Next.js 15 / React 19, TypeScript, pdf-lib, pdfjs-dist, @neslinesli93/qpdf-wasm, tesseract.js 7, mupdf 1.28, zetajs 1.2 (Office), vitest, Playwright, next-intl (en+he).

## Global Constraints

- Success = **workflows**, never tool count. Ship only what clears the quality bar; skip + document the rest in `docs/bentopdf-gap.md`. No placeholders, no fake implementations.
- All engines **lazy-loaded, same-origin, no CDN** — `new URL("<pkg>/dist/x.wasm", import.meta.url)`, matching `frontend/lib/qpdf.ts`.
- Every tool: en + he i18n complete; axe-clean; real failure-path message; `"use client"`.
- Every tool declares `accepts` (mime+priority) and workflow-language `keywords` in `module.json`.
- Local-first: nothing leaves the device. Keep the `ui.privacy` note on every tool.
- Feasibility gate: spike a new engine on a real file and inspect real output BEFORE wiring its tool. Failing the bar → skip + document, do not ship.
- After changing `module.json` / i18n, regenerate registries (`pnpm modgen` or the repo's generate script) so search/messages/api registries stay in sync.
- Verify pipeline must be green before the single end-of-sprint deploy: lint · typecheck · unit · e2e · axe · screenshots.

---

## Phase 1 — Engine spikes (gate the rest; prove or cut each)

Each spike is a throwaway Node/script or minimal harness that feeds a real file to the engine and asserts real output. Kept under `packages/modules/pdfkit/spikes/` and deleted before deploy. A spike that fails the bar flips its dependent tools to "skip + document."

### Task 1: mupdf spike — structured text + image extract + PDF/A

**Files:**
- Create: `packages/modules/pdfkit/spikes/mupdf-spike.mjs`
- Add dep: `packages/modules/pdfkit/package.json` → `"mupdf": "^1.28.0"`

- [ ] **Step 1:** `pnpm --filter @omnio/mod-pdfkit add mupdf@^1.28.0`
- [ ] **Step 2:** Write `mupdf-spike.mjs`: load a real multi-page PDF fixture, call `mupdf.Document.openDocument`, extract page 1 `toStructuredText("preserve-whitespace").asJSON()`, list embedded images, and attempt a PDF/A write. Print byte counts + a text sample.
- [ ] **Step 3:** Run `node packages/modules/pdfkit/spikes/mupdf-spike.mjs`. Expected: non-empty structured text, image count, PDF/A bytes > 0. Record which of {structured-text, extract-images, PDF/A, outlines, table-find} actually work in the plan for Phase 5.
- [ ] **Step 4:** If any sub-capability fails or is low quality, mark it "skip + document" for Phase 5. Commit the spike + finding note.

### Task 2: tesseract.js spike — OCR accuracy + word boxes

**Files:**
- Create: `packages/modules/pdfkit/spikes/tesseract-spike.mjs`
- Add dep: `"tesseract.js": "^7.0.0"`

- [ ] **Step 1:** Add dep. Provide a real scanned-page image fixture.
- [ ] **Step 2:** Recognize with `{ tessedit_pageseg_mode }`, log recognized text + per-word bbox + confidence.
- [ ] **Step 3:** Run it. Expected: legible text, word bboxes present (needed to place an invisible text layer). Bar: mean confidence on a clean scan is usable.
- [ ] **Step 4:** Record language-pack load path (same-origin) for Phase 3. Commit spike + finding.

### Task 3: Office spike — zetajs/LibreOffice-WASM feasibility

**Files:**
- Create: `packages/modules/pdfkit/spikes/office-spike.md` (findings — this spike is mostly a distribution/size investigation)

- [ ] **Step 1:** Determine where zetajs sources the LibreOffice WASM (`soffice.wasm`) — npm-bundled vs external distribution — and its real size.
- [ ] **Step 2:** Decide honestly against the platform no-CDN/same-origin rule and bundle sanity: (a) host the LibreOffice WASM same-origin as an emitted asset if feasible; (b) if the binary cannot be shipped same-origin at acceptable size/quality, this is the "prove it impossible with evidence" path — fall back to the lighter `mammoth`(docx→html→pdf)+`xlsx` route documented as partial, or skip with evidence.
- [ ] **Step 3:** Write the decision + evidence (sizes, source) into `office-spike.md`. This gates Phase 6's approach.
- [ ] **Step 4:** Commit findings.

---

## Phase 2 — Cheap wins (engines already present: qpdf + pdfjs)

Pure arg-builders / parsers live in `shared/` and are unit-tested; the tool components call `runQpdf` / pdfjs. Add each tool to `module.json` + i18n (en/he) and regenerate registries.

### Task 4: qpdf structural tools — linearize, sanitize, repair (shared arg-builders)

**Files:**
- Create: `packages/modules/pdfkit/shared/qpdf-args.ts`
- Create: `packages/modules/pdfkit/shared/qpdf-args.test.ts`

**Interfaces:**
- Produces: `linearizeArgs(inPath,outPath): string[]`, `sanitizeArgs(inPath,outPath): string[]`, `repairArgs(inPath,outPath): string[]` — consumed by the three tool components.

- [ ] **Step 1: Write the failing test** `qpdf-args.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { linearizeArgs, repairArgs, sanitizeArgs } from "./qpdf-args.ts";

describe("qpdf arg builders", () => {
  it("linearize enables web optimization", () => {
    expect(linearizeArgs("/in.pdf", "/out.pdf")).toEqual(["--linearize", "/in.pdf", "/out.pdf"]);
  });
  it("repair recovers structure without decrypting user content", () => {
    const a = repairArgs("/in.pdf", "/out.pdf");
    expect(a).toContain("--recompress-flate");
    expect(a[a.length - 2]).toBe("/in.pdf");
    expect(a[a.length - 1]).toBe("/out.pdf");
  });
  it("sanitize drops javascript and rebuilds", () => {
    const a = sanitizeArgs("/in.pdf", "/out.pdf");
    expect(a).toContain("--remove-unreferenced-resources=yes");
  });
});
```

- [ ] **Step 2:** Run `pnpm --filter @omnio/mod-pdfkit test -- qpdf-args` → FAIL (module missing).
- [ ] **Step 3:** Implement `qpdf-args.ts`:

```ts
/** qpdf argument builders for structural tools — pure, unit-testable. */
export function linearizeArgs(inPath: string, outPath: string): string[] {
  return ["--linearize", inPath, outPath];
}
export function repairArgs(inPath: string, outPath: string): string[] {
  // qpdf always reconstructs the cross-reference table on read; recompress to
  // normalise streams so a damaged-but-recoverable file is rewritten cleanly.
  return ["--recompress-flate", "--object-streams=generate", inPath, outPath];
}
export function sanitizeArgs(inPath: string, outPath: string): string[] {
  return ["--remove-unreferenced-resources=yes", "--object-streams=generate", inPath, outPath];
}
```

- [ ] **Step 4:** Run test → PASS.
- [ ] **Step 5:** Commit `feat(pdfkit): qpdf arg builders for linearize/repair/sanitize`.

### Task 5: Wire linearize / repair / sanitize tool components

**Files:**
- Create: `frontend/tools/pdf-linearize.tsx`, `frontend/tools/pdf-repair.tsx`, `frontend/tools/pdf-sanitize.tsx`
- Modify: `module.json` (3 tool entries), `i18n/en.json`, `i18n/he.json`

- [ ] **Step 1:** Build each component modeled on `pdf-compress.tsx` (drop zone → run `runQpdf(raw, <argBuilder>)` → `downloadPdf`), with load/op failure alerts and the privacy note.
- [ ] **Step 2:** Add `module.json` entries (`tier:"browser"`, `accepts` pdf, keywords: repair→["repair","fix","damaged","corrupt","recover"], linearize→["linearize","optimize","fast web view","web"], sanitize→["sanitize","clean","strip javascript","safe"]).
- [ ] **Step 3:** Add en+he i18n (name/description/action/working/error/note).
- [ ] **Step 4:** Regenerate registries; run typecheck + lint.
- [ ] **Step 5:** Commit `feat(pdfkit): linearize, repair, sanitize tools`.

### Task 6: Extract embedded images (pdfjs)

**Files:**
- Create: `shared/extract.ts` + `shared/extract.test.ts` (pure: dedup + filename numbering), `frontend/lib/pdf-images.ts` (pdfjs image-XObject walk), `frontend/tools/pdf-extract-images.tsx`
- Modify: `module.json`, i18n en/he

- [ ] **Step 1:** Failing test for `imageFilename(pageIndex, imageIndex, ext)` and `dedupeImages(hashes)` pure helpers.
- [ ] **Step 2:** Run → FAIL.
- [ ] **Step 3:** Implement pure helpers; implement pdfjs walk (`page.getOperatorList()` → image objects → canvas → blob), zip via existing zip approach used by `pdf-to-images.tsx`.
- [ ] **Step 4:** Tests PASS; manual check on a real image-bearing PDF.
- [ ] **Step 5:** `module.json` + i18n; regenerate; commit.

### Task 7: Extract attachments (qpdf --json)

**Files:**
- Create: `shared/attachments.ts` + `shared/attachments.test.ts` (parse qpdf JSON embedded-files → {name,bytesRef}), `frontend/tools/pdf-extract-attachments.tsx`
- Modify: `module.json`, i18n en/he

- [ ] **Step 1:** Failing test: `parseEmbeddedFiles(qpdfJson)` returns the embedded file names for a known JSON shape; returns `[]` when none.
- [ ] **Step 2:** Run → FAIL.
- [ ] **Step 3:** Implement parser; tool runs qpdf `--json` (+ `--json-key`) to list, then extracts each; zip if >1; honest empty-state ("No attachments in this PDF").
- [ ] **Step 4:** Tests PASS.
- [ ] **Step 5:** `module.json` + i18n; regenerate; commit.

---

## Phases 3–6 — detailed at their gate

These depend on the Phase 1 spike outcomes; their bite-sized tasks are written into this file once the engine is proven (writing real test code against unproven engine output would be a placeholder). Scope locked now, steps expanded at the gate:

- **Phase 3 — OCR / searchable PDF** (`pdf-ocr`, tesseract.js): render pages (pdfjs) → recognize → write invisible text layer (pdf-lib, render mode 3) aligned to word bboxes → searchable output. Honest accuracy note. Gate: Task 2.
- **Phase 4 — Unified editor** (`pdf-edit`, pdfjs render + overlay + pdf-lib bake): toolbar = highlight, underline, shape, text note, freehand, sign (draw/type/image), fill-form (AcroForm), redact (TRUE removal, re-extract-text verified). One surface; per-mode keywords in `module.json` all route here. Largest task — sub-plan into per-mode steps at the gate.
- **Phase 5 — Structure track** (mupdf): PDF/A, bookmark/TOC editor + split-by-bookmark, table extract → CSV/XLSX, PDF→Word, PDF→Excel. Each sub-tool ships only if Task 1 proved its capability at quality; else skip + document. Gate: Task 1.
- **Phase 6 — Office → PDF** (`office-to-pdf`): approach per Task 3 evidence (LibreOffice-WASM same-origin, or documented mammoth/xlsx partial, or evidenced skip). Honest one-time download notice if heavy. Gate: Task 3.

## Phase 7 — Verify + deploy + verdict

- [ ] Run lint, typecheck, unit (`pnpm test`), e2e (Playwright, port-3100 workaround then revert), axe on every new tool, capture screenshots.
- [ ] Delete `spikes/`.
- [ ] Update `docs/bentopdf-gap.md`: mark each workflow Supported/Partial/Not, list any skips with evidence.
- [ ] `~/scripts/omnio-release` → deploy → verify live at https://omnio.09012000.xyz/api/version.
- [ ] Final review: answer **"Can I uninstall BentoPDF today? YES/NO"**; if NO, list every blocking workflow.
- [ ] STOP. Do not start the next milestone.

## Self-review notes

- Spec coverage: every Part-3 priority maps to a phase (OCR→3, editor→4, structure/extract→5, Office→6, cheap wins→2). Quality gate (Part 4) = Global Constraints + per-engine spike. UX (Part 5) = `accepts`/`keywords`/category in every tool task. Verify (Part 7) = Phase 7. Stop (Part 8) = last step.
- Type consistency: arg-builders `(inPath,outPath)=>string[]` match `runQpdf`'s `buildArgs` signature in `frontend/lib/qpdf.ts`.
