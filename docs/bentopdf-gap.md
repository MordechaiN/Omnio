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

## Verdict

Omnio now covers **every high-frequency BentoPDF workflow** — combine, convert
both directions, split, extract text, compress, and password protect/unlock —
plus page surgery (reverse, duplicate, crop, n-up, blank, split-half, flatten,
remove-blank). A typical user can uninstall BentoPDF. The honest remaining gaps
are OCR, interactive editing/redaction/signing, and Office conversions — each
deferred for a concrete technical reason, not a placeholder.
