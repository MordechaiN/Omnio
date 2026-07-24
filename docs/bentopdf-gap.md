# BentoPDF → Omnio gap analysis (M16)

Audited against the BentoPDF source (`github.com/alam00000/bentopdf`,
`src/js/config/pdf-tools.ts`). BentoPDF advertises "100+ tools"; the PDF
surface is the ~70 entries below. Every verdict is: **have** (Omnio already
shipped it), **added** (this milestone), or **skipped** (with the concrete
technical reason).

## Library reality check

| Capability class | What it needs in-browser | Omnio's answer |
|---|---|---|
| Structural page edits | pdf-lib (pure JS) | ✅ used |
| Render / rasterize / text | pdfjs-dist | ✅ added this milestone |
| Encrypt / decrypt / optimize | qpdf compiled to WASM | ✅ added this milestone (`@neslinesli93/qpdf-wasm`) |
| OCR | tesseract.js (~heavy, variable quality) | ❌ skipped |
| Office → PDF | LibreOffice WASM (~hundreds of MB) | ❌ skipped |
| Interactive editor / redact / forms fill / sign | rich canvas editor + cert handling | ❌ skipped |

## Feature-by-feature

### Have (pre-M16)
merge, split (by range), split-by-size, rotate, delete-pages, extract-pages
(via split), reorder (organize), add-page-numbers, add-watermark, view-metadata,
edit-metadata, remove-metadata (edit clears fields).

### Added (M16)
- **images→pdf** (jpg/png/webp) — pdf-lib embed.
- **reverse-pages** — pdf-lib.
- **duplicate pages** (organize/duplicate) — pdf-lib.
- **crop** — pdf-lib crop box.
- **n-up** (2/4/6/9 per sheet) — pdf-lib embedPdf + drawPage.
- **add-blank-page** — pdf-lib insertPage.
- **split-in-half** (spread → singles) — pdf-lib.
- **flatten** (form flatten) — pdf-lib form.flatten().
- **pdf→images** (png/jpg, zip) — pdfjs render.
- **pdf→text** — pdfjs getTextContent.
- **remove-blank-pages** — pdfjs render + pixel-ink heuristic + pdf-lib rebuild.
- **compress** — qpdf object-stream + flate recompression.
- **protect / encrypt** — qpdf 256-bit AES.
- **unlock / decrypt** — qpdf with known password.

### Covered by an equivalent Omnio tool
- **pdf-to-jpg / png / webp** → PDF to Images (format selectable).
- **jpg/png/webp/image-to-pdf** → Images to PDF (multi-format).
- **change-permissions / remove-restrictions** → Unlock (removes the
  restriction layer for files you can open).
- **pdf-to-zip** → PDF to Images already zips its output.
- **combine / alternate-merge** → Merge covers the common combine case; true
  page-interleave (alternate) is a niche not yet built (low demand).

### Skipped — with reasons (no placeholders shipped)
- **ocr-pdf** — needs tesseract.js (~a few MB of WASM + language data) and its
  accuracy is inconsistent enough that shipping it as "make your scan
  searchable" would over-promise. Deferred to a milestone that can budget the
  weight and set honest expectations.
- **sign-pdf** — real signing needs the user's certificate/key and a trust
  story; a decorative "signature image" isn't a signature. Out of scope until
  key handling is designed.
- **edit / redact / form-filler / annotations / add-header-footer as WYSIWYG /
  posterize / change-text-color / invert-colors / greyscale** — these are an
  interactive canvas editor (BentoPDF uses cropperjs + a rete node graph). That
  is a product surface of its own, not a drop-in tool, and rasterizing a whole
  PDF to recolor it would wreck text fidelity. Deferred.
- **word/xps/svg/heic/tiff/bmp-to-pdf & office conversions** — need
  LibreOffice-WASM / wasm-vips / heic2any / utif. Very large binaries for
  formats most users convert rarely; image→PDF already covers jpg/png/webp.
- **extract-images / extract-tables / extract-attachments / pdf-to-markdown /
  bookmark split** — feasible with pdfjs operator/structure walking but each is
  a real parser; queued behind the higher-demand tools above.
- **linearize / repair / sanitize** — qpdf can do these; low everyday demand,
  easy to add next since the qpdf pipeline now exists.

## Critical re-review — workflow by workflow (not tool count)

Re-audited against BentoPDF's **actual** shipped list (its README, ~110 PDF
tools) rather than a guess. Two facts change the honest verdict:

1. BentoPDF is **not** "a few small libraries." It compiles **PyMuPDF,
   Ghostscript, CoherentPDF and Tesseract to WASM** and still runs 100%
   client-side. So "too heavy for the browser" is **not** a valid reason to
   skip most of these — BentoPDF proves they run locally. The real cost is
   engineering effort and bundle weight we choose to spend, not feasibility.
2. Tool count is misleading (many BentoPDF entries are one-format-per-tile
   conversions). The honest question is per *workflow*.

### Everyday workflows — where Omnio stands
| Workflow | Omnio | Note |
|---|---|---|
| Merge / split / extract / delete / reorder / rotate pages | ✅ | full |
| Reverse / duplicate / crop / N-up / blank / split-half / flatten | ✅ | M16 |
| Remove blank pages | ✅ | M16 |
| Compress | ✅ | qpdf |
| Password protect / unlock | ✅ | qpdf 256-bit |
| PDF → images (PNG/JPEG, zipped) | ✅ | WebP/TIFF/BMP output missing |
| Images → PDF (JPG/PNG/WebP) | ✅ | BMP/TIFF/HEIC/PSD missing |
| PDF → text | ✅ | M16 |
| Watermark / page numbers / metadata view-edit-remove | ✅ | — |
| **OCR (scanned → searchable)** | ❌ | common; Tesseract-WASM |
| **Fill & sign a form** | ❌ | common; interactive |
| **Redact** | ❌ | common; interactive + true removal |
| **Annotate / highlight / comment** | ❌ | interactive editor |
| **Office → PDF** (Word/Excel/PPT/ODF) | ❌ | common; needs converter engine |
| **PDF → Word / Excel / extract tables** | ❌ | common; PyMuPDF-class parser |
| **Extract embedded images / attachments** | ❌ | moderate |
| **Bookmarks / table of contents / split-by-bookmark** | ❌ | moderate |

### Honest answer to "can I uninstall BentoPDF today?"
**Not quite — it depends on the user.**
- If your PDF life is combine / split / compress / protect / convert to-and-from
  images / extract text / page surgery — **yes, uninstall it.** Omnio covers all
  of that, locally, today.
- If you ever **OCR a scan, fill or sign a form, redact, annotate, or convert
  Office documents**, Omnio cannot do it yet. Those are common, not fringe, so a
  blanket "replace BentoPDF" would over-claim.

### What is still missing — the pre-M17 backlog
**Cheap wins (should build before claiming parity — engine already present):**
- Linearize / Repair / Sanitize — `qpdf` pipeline already exists.
- PDF→image WebP/TIFF/BMP output, WebP already trivial via canvas.
- Extract embedded images — pdfjs image XObjects.
- Custom-degree rotation (today only 90° multiples).
- Grayscale (rasterize path via pdfjs already exists).
- Markdown / plain-text → PDF.
- Booklet / combine-to-single-page imposition — pure pdf-lib.

**Genuine capability gaps (need a real new engine or interactive surface):**
- **OCR** — Tesseract-WASM + language data + honest accuracy expectations.
- **Interactive editor** — annotate / redact / fill-forms / sign / recolor.
  One product surface (canvas + overlay + true content removal for redaction),
  not a drop-in tool. Highest-value single milestone.
- **Office ⇄ PDF & PDF→editable** — a converter engine (PyMuPDF/Ghostscript-class
  WASM). Large, but BentoPDF shows it is browser-feasible and local-first.
- **Structure tools** — bookmarks / TOC / attachments / table extraction.

### Verdict
Omnio replaces BentoPDF for the **high-frequency core** and is a genuine daily
driver for most page/convert/secure work. It is **not yet a full parity
replacement**: OCR, form fill/sign, redaction, annotation and Office conversion
are real, common workflows still absent. None are technically impossible in the
browser — BentoPDF ships them locally — so these are prioritised engineering
work, not hard limits. Recommend: land the "cheap wins" list, then dedicate a
milestone to the interactive editor (highest user value), before declaring
BentoPDF fully replaceable.

## Beta Sprint 2 — final status (workflow verdict)

This sprint added 9 tools + 3 engines (tesseract.js, mupdf, plus wider qpdf use),
all local-first and same-origin (no CDN). Workflow-by-workflow now:

| Workflow | Status | Notes |
|---|---|---|
| Merge/split/extract/delete/reorder/rotate | ✅ | pre-existing |
| Reverse/duplicate/crop/N-up/blank/split-half/flatten | ✅ | pre-existing |
| Remove blank pages · Compress · Protect/Unlock | ✅ | pre-existing |
| PDF↔images · PDF→text · watermark/page-nums/metadata | ✅ | pre-existing |
| **Repair damaged PDF** | ✅ NEW | qpdf rebuild |
| **Optimize for web (linearize)** | ✅ NEW | qpdf |
| **Sanitize** | ✅ NEW | qpdf |
| **Extract embedded images** | ✅ NEW | mupdf, native decode |
| **Extract attachments** | ✅ NEW | mupdf |
| **OCR → searchable PDF** | ✅ NEW | tesseract.js; browser-verified (21 words, 96% conf) |
| **Annotate: highlight/underline/shapes/notes/freehand** | ✅ NEW | unified editor |
| **Real redaction (true removal)** | ✅ NEW | mupdf applyRedactions; browser-verified content gone |
| **Fill forms** | ✅ NEW | pdf-lib AcroForm + flatten |
| **Sign** | ✅ NEW | draw / type / upload, placed via the unified editor; aspect ratio preserved. Visual signature only — labelled in-UI as not a digital certificate |
| **Split by bookmarks** | ✅ NEW | mupdf outline + pdf-lib |
| **PDF/A conversion** | ❌ GAP | mupdf can't emit conformant PDF/A (probed: `unknown pdf option: pdfa`); needs Ghostscript-WASM |
| **Table extraction / PDF→Excel** | ❌ GAP | reliable table detection is PyMuPDF-Python-only, absent in mupdf.js; won't ship a guesser that fails the quality bar |
| **PDF → Word** | ❌ GAP | mupdf `asHTML()` works → best-effort DOCX is feasible but not built this sprint |
| **Bookmark write-editor** | ◑ PARTIAL | `outlineIterator` exists; split-by-bookmarks shipped, full editor deferred |
| **Office → PDF** (Word/Excel/PPT) | ✅ SHIPPED (v0.3.0-alpha) | `office-to-pdf`, LibreOffice running **server-side** in the worker container — not in the browser. This is a deliberate architecture split from BentoPDF's fully-client-side model and is declared as such in the tool's `tierReason`; the file leaves the device for conversion |

### Can I uninstall BentoPDF today? **Not fully — NO.**
Omnio now covers the overwhelming majority of everyday PDF work — including the
big ones that were missing (OCR, annotate, real redaction, fill forms, extract
images/attachments, repair). For most users' daily PDF life, Omnio is now a
complete replacement.

It is **not** 100% parity. Uninstalling BentoPDF is blocked only if you rely on:
1. **PDF/A** conformance — needs Ghostscript-WASM. Re-probed against mupdf
   1.28.0 (2026-07-24): still no PDF/A output — the API exposes only
   `encryption` as a save option, and every `PDFA` symbol in its typings is
   `PDFAnnotation`. Documented gap, not faked.
2. **PDF → Word/Excel / table extraction** — best-effort DOCX feasible; reliable
   tables aren't, so not shipped rather than ship a low-quality guesser.
3. **Bookmark/TOC write-editor** — split-by-bookmark ships; creating and editing
   an outline does not.
4. **Fully on-device Office conversion** — Office → PDF works, but server-side.
   If your requirement is that the file never leaves the machine, that specific
   workflow does not meet it.

No remaining gap is a browser hard-limit; each is scoped, honest, and either
pending a decision (Office) or a follow-up milestone.
