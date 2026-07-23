# Beta Sprint 2 — Replace BentoPDF completely (design)

Status: **approved to build** (design forks confirmed by owner 2026-07-22).
Success measured by **workflows**, never tool count. Definition of done: owner can
uninstall BentoPDF.

## Confirmed decisions

1. **Interactive editing is ONE unified editor surface**, not 7 discrete tools.
   A single "Edit PDF" surface renders pages to canvas with an overlay layer and a
   toolbar: highlight, underline, shapes, text note, freehand, fill-form, sign,
   redact. All bake into the output PDF on export. Redaction does **true content
   removal**, not a drawn black box.
2. **Office → PDF ships** via LibreOffice-WASM, lazy-loaded only when the tool runs,
   behind a clear one-time "downloading converter (~100 MB)" notice. Committed only
   after a real `.docx`/`.xlsx` clears the quality bar in a spike.

## Engine strategy (all lazy-loaded, same-origin, no CDN)

Matches the existing `qpdf.ts` pattern: `new URL("<pkg>/dist/x.wasm", import.meta.url)`
so webpack emits the binary as a same-origin asset, loaded only when the tool opens.

| Engine | New? | Unlocks |
|---|---|---|
| `pdf-lib` | have | annotation/redaction bake, form fill, sign flatten |
| `pdfjs-dist` | have | page render (editor canvas, OCR pre-render, extract-images) |
| `@neslinesli93/qpdf-wasm` | have | linearize, sanitize, repair, attachments (JSON), outlines |
| `tesseract.js` | **new** | OCR → invisible text layer → searchable PDF |
| `mupdf` (MuPDF/PyMuPDF WASM) | **new** | structured text, extract images, PDF/A, bookmarks, table find, PDF→Word source |
| LibreOffice-WASM | **new** | Office (Word/Excel/PPT/ODF) → PDF |

**Feasibility gate (per Part 4 + "prove it, don't assume"):** before wiring a tool
that needs a new engine, run a spike — real input file, inspect real output. If output
quality cannot reach Omnio's bar, the tool is **skipped and the reason documented** in
`docs/bentopdf-gap.md`, not shipped as a placeholder.

## Workflow → tool mapping

**Cheap wins (engines already present) — build first:**
- Linearize / Optimize for web — qpdf `--linearize`.
- Sanitize / strip risky content — qpdf.
- Repair damaged PDF — qpdf recovery (mupdf fallback if it clears the bar).
- Extract embedded images — pdfjs image XObjects → zip.
- Extract attachments — qpdf `--json` embedded files.

**OCR track:**
- `pdf-ocr` — tesseract.js over rendered pages, writes an invisible (render-mode 3)
  text layer aligned to word boxes → the output PDF is selectable/searchable.
- Language pack lazy-loaded; honest accuracy note; searchable = same tool's promise.

**Unified editor (`pdf-edit`):**
- Render pages (pdfjs) → overlay canvas. Toolbar tools: highlight, underline, shape
  (rect/line/ellipse/arrow), text note, freehand, signature (draw/type/image),
  form-field fill (AcroForm via pdf-lib), redact.
- Export bakes overlays into the PDF (pdf-lib). Redact removes the covered content
  (rebuild region), not just paints over it — verified by re-extracting text.

**Structure track (mupdf):**
- PDF/A conversion.
- Bookmark / TOC editor + split-by-bookmark.
- Table extraction (quality-gated) → CSV/XLSX.
- PDF → Word (best-effort structured reflow; honest "best possible local" framing).
- PDF → Excel (only when table extraction clears the bar; else documented partial).

**Office track:**
- `office-to-pdf` — LibreOffice-WASM; accepts doc/docx/xls/xlsx/ppt/pptx/odt/ods/odp.

## UX integration (Part 5 — no isolated tools)

Every new tool declares in `module.json`:
- `accepts` (mime + priority) → **Universal Drop Zone** routes the file and
  **Smart Actions** surfaces the tool for that file type.
- `keywords` → **Search** finds it by workflow language ("make searchable", "sign",
  "redact", "word to pdf").
- lives under the `pdf` **category** (Office track may warrant an `office` category tie).
- i18n keys in `mod-pdfkit` (en + he), matching every existing tool.

The unified editor registers workflow-language keywords for each sub-tool so search
for "highlight" / "redact" / "fill form" all land on the editor with that mode.

## Quality bar (Part 4)

Never ship quantity over quality. A tool ships only if: real input → correct,
faithful output; a11y-clean (axe); i18n complete (en+he); handles the failure path
(bad/locked/corrupt file) with a real message. Anything short → skip + document why.

## Verification (Part 7) — deploy only when all green

lint · typecheck · unit tests · e2e · accessibility (axe) · screenshots. Then
`~/scripts/omnio-release` build → deploy → verify live. One deploy at sprint end.

## Final review (Part 6)

Re-answer, honestly: **Can I uninstall BentoPDF today? YES / NO.** If NO, list every
remaining workflow that blocks it — no hidden weaknesses.

## Out of scope

Temporary Share (its own milestone, `docs/temporary-share-design.md`). M17. This sprint
is PDF-parity only.

## Phasing (execution order)

1. Engine spikes (mupdf, tesseract, LibreOffice-WASM) — prove or cut each.
2. Cheap wins (qpdf/pdfjs) — linearize, sanitize, repair, extract-images, extract-attachments.
3. OCR / searchable PDF.
4. Unified editor (highlight → underline → shapes → notes → freehand → sign → fill → redact).
5. Structure track (PDF/A, bookmarks, table extract, PDF→Word/Excel).
6. Office → PDF.
7. Full verification + screenshots + deploy + final BentoPDF verdict.

STOP after deploy. Do not start the next milestone.
