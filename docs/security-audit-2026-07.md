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


### 4. Vulnerable shipped dependencies — *fixed, and a correction*

The first pass of this audit claimed the advisories traced only through build
and lint tooling. **That was wrong**, and the error came from generalising off
the first entry in the list rather than reading all of it. What actually
shipped:

| Package | Severity | Issue |
|---|---|---|
| `next` | high ×3 | SSRF in Server Actions, SSRF via rewrites, App Router DoS |
| `sharp` (via next) | high | inherited libvips vulnerabilities — image decoding |
| `postcss` (via next) | high ×2 | arbitrary file read, path traversal |
| `file-type` (api) | moderate | **infinite loop in the ASF parser** |

Two of these sit exactly where this audit's threat model points: `file-type`
hangs forever on a crafted upload, and `sharp` is libvips — the code that
decodes hostile images.

`next` → `^15.5.21`, `file-type` → `^21.3.1` (its API changed; the caller was
updated), with root `pnpm.overrides` pinning `sharp`, `postcss` and
`brace-expansion`. `pnpm audit --prod` now reports **no known
vulnerabilities**.

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

1. **Nonce-based `script-src`**, retiring `unsafe-inline`. Already tracked as
   debt; the CSP added here is the scaffolding it would slot into.
2. **Subresource limits on worker-tier uploads.** `OMNIO_MAX_UPLOAD_MB`
   defaults to 512; worth confirming the worker enforces it while streaming
   rather than after buffering.
3. **Keep `pnpm audit --prod` in CI.** Today's clean result is a point in time;
   the value is in noticing the next one.

---

## Judgement

I would keep my own contracts in this. The paths that could have turned a
hostile file into code execution or a dead tab are closed or verified, and the
two that remain open are named above rather than papered over.


---

## Second pass — July 27

Re-reviewed against the full surface list, including areas the first pass did
not reach.

**Verified present and correct, unchanged:**

- **Supply chain.** `pnpm-workspace.yaml` blocks dependency install scripts by
  default and allows exactly five audited packages. This is the strongest
  single control against a compromised transitive dependency, and it was
  already there.
- **No Service Worker.** Nothing registers one, so there is no cache to poison
  and no stale-code path. Verified absent rather than assumed.
- **Clipboard.** The paste handler accepts only `kind === "file"` and routes it
  through the same inspection as a drop. Pasted markup never reaches the DOM.
- **Object URLs.** Preview URLs are revoked on change and on unmount, keyed on
  primitives so an unrelated workspace write cannot revoke a live one.

**Added:**

- `Cross-Origin-Opener-Policy: same-origin` and
  `Cross-Origin-Resource-Policy: same-origin` — sever the opener relationship
  and stop other origins embedding Omnio's responses.
- `COEP: require-corp` was **deliberately not added**. It exists to unlock
  SharedArrayBuffer, which nothing here needs, and would reject cross-origin
  subresources lacking CORP — a real chance of breaking on-device engines for a
  guarantee Omnio is not asking for.

**Overall assessment.** Every path by which a hostile file could reach code
execution, escape a sandbox, traverse storage, or exhaust the tab is closed or
has been attacked and held. The two knowingly open items — inline script in the
CSP, and parser hardening delegated to the browser's own sandboxed engines —
are recorded above with reasons rather than quietly carried.

I would keep my own contracts, passport scans and tax records in this.
