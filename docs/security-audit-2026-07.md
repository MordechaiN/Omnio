# Security audit — July 2026

Scope: every place Omnio parses, renders, stores or transmits data that came
from outside. Every file was treated as hostile, every filename as malicious,
every archive as a bomb.

The bar used throughout: **would I keep my own passport scan and signed
contracts in this?** In a local-first product the answer turns almost entirely
on one question — can anything that arrives from outside get script running on
this origin, or exhaust the tab before the person can react? Script here reads
the whole OPFS workspace.

Verification, not assertion: where a protection already existed it was attacked
rather than replaced.

---

## Risks found and mitigated

### 1. Decompression bomb on drop — *fixed*

`inspectFile` fully decompressed **every** archive into memory to read up to
eight filenames, automatically, on drag-and-drop, before the person had chosen
anything. A small crafted archive expanding to tens of gigabytes would take the
tab down on the least trusted path in the product.

Fixed architecturally rather than with a size cap: fflate's entry filter walks
the central directory and returns `false`, so **nothing is ever inflated**.
Names are collected into an array, so archive contents never become object keys
either. The declared expansion is now recorded as a fact about the file.

### 2. Decompression bomb on workspace import — *fixed*

The same class in a second place. An imported workspace archive — something you
were *sent* — was inflated whole before anything could object. Now measured
first via the same no-inflate pass and refused past a ceiling that no real
document set approaches.

### 3. Content-Security-Policy was one directive — *strengthened*

The policy said only `frame-ancestors 'none'`: clickjacking cover, and nothing
about what may load or execute. Now a real policy with `default-src 'self'`,
`object-src 'none'`, `base-uri 'none'`, `form-action 'self'`, and explicit
allowances for what Omnio genuinely needs (`blob:` previews, `worker-src` for
pdf.js and tesseract, `frame-src` for the sandboxed HTML preview).

Verified in a production build across seven surfaces including WASM, workers,
the sandboxed iframe and blob thumbnails: **zero violations, nothing broken**.

---

## Protections verified and left alone

- **Markdown rendering.** Escape-first, then emit a fixed tag set. Attacked with
  19 payloads (raw tags, `javascript:`/`vbscript:`/`data:` URLs, case and
  whitespace variants, attribute breakouts, nesting tricks). All neutralised;
  the battery is now a permanent test. Notably my *first* assertions failed on
  safe output — they matched escaped text rather than live markup, and "fixing"
  the renderer to satisfy them would have been theatre.
- **HTML preview.** Sandboxed iframe, `sandbox=""` by default. The scripts
  toggle adds `allow-scripts` and never `allow-same-origin`, so even with
  scripts enabled the frame is opaque-origin and cannot reach the workspace.
  This is the correct design; unchanged.
- **OPFS paths.** Derived solely from a SHA-256 hex digest
  (`blobs/<aa>/<hash>`). Filenames never touch the path, so traversal is
  impossible by construction rather than by filtering.
- **No `eval`, no `new Function`, no `innerHTML`** anywhere in app or module
  code. The only `dangerouslySetInnerHTML` uses are four static theme-init
  scripts and the markdown renderer above.
- **Images and SVG** are rendered through `<img>`/object URLs, where SVG cannot
  execute script.

---

## Risks accepted, with reasons

- **`script-src` retains `unsafe-inline` and `unsafe-eval`.** Next's bootstrap
  is inline and the on-device engines (tesseract, mupdf, pdf.js) are
  WebAssembly. Removing these needs the nonce work already tracked in
  `docs/TECH_DEBT.md`. Claiming a strict script policy while shipping this would
  be dishonest; the surrounding directives are real and were added.
- **Parser hardening is delegated to the browser.** Crafted PDFs and images are
  parsed by pdf.js, mupdf and the platform image decoders — all sandboxed,
  memory-safe at the boundary, and vastly better tested than anything Omnio
  could add. Wrapping them in our own validation would add complexity without
  adding safety.
- **A very large legitimate file can still exhaust memory.** Decoding a genuine
  30000×30000 image costs what it costs. This is a resource limit, not an
  attack surface, and the honest fix is the browser's own OOM handling rather
  than an arbitrary refusal that would break real work.

---

## Remaining recommendations

1. **Dependency advisories.** `pnpm audit --prod` reports 8 high / 7 moderate.
   Every one inspected traces through build and lint tooling
   (`brace-expansion` via eslint, testcontainers, typescript-eslint) rather than
   shipped runtime code — but this needs a proper pass with upgrades and a
   re-audit, not a paragraph. It is the largest remaining item.
2. **Nonce-based `script-src`**, retiring `unsafe-inline`. Already tracked as
   debt; the CSP added here is the scaffolding it would slot into.
3. **Subresource limits on worker-tier uploads.** `OMNIO_MAX_UPLOAD_MB`
   defaults to 512; worth confirming the worker enforces it while streaming
   rather than after buffering.

---

## Judgement

I would keep my own contracts in this. The paths that could have turned a
hostile file into code execution or a dead tab are closed or verified, and the
two that remain open are named above rather than papered over.
