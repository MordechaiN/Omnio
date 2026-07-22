# Office → PDF spike — findings (evidence)

## What zetajs actually ships
- `zetajs@1.2.0` npm package = **62.8 kB** of JS only. It is a UNO bridge into a
  running ZetaOffice instance. It does **not** contain the office engine.
- The engine is **ZetaOffice / LibreOffice compiled to WASM** (`soffice.wasm` +
  data), distributed **separately** by allotropia (github.com/allotropia/zetajs),
  **not on npm**. Real size is **~300 MB** (full LibreOffice), not the ~100 MB
  first estimated.

## Feasibility against the platform contract
- Platform rule: **no CDN, same-origin only**; runtime assets live under
  `~/docker/<name>/`, repo stays portable. Loading the WASM from allotropia's CDN
  is **not allowed**.
- Self-hosting is technically possible: vendor the ZetaOffice WASM build as a
  same-origin static asset, lazy-fetched on first Office→PDF use. But that is
  **~300 MB vendored into the deploy** — a runtime/infra change (an asset under
  `~/docker/`), not a repo-only change, and a heavy one-time client download.

## Honest conclusion
Full-fidelity Office→PDF is **feasible but not free**: it costs ~300 MB of
self-hosted WASM + a deploy/infra step. This is **3× the size the "ship it"
decision was based on**, and it is not npm-installable. Per "prove it, don't
assume": it is **not impossible** — so the decision is a cost/UX judgement, not a
technical wall.

## Options for Phase 6 (owner re-decision — decision basis changed)
1. **Full ZetaOffice** — vendor ~300 MB same-origin under `~/docker/`, lazy-load,
   honest download notice. Highest fidelity (Word/Excel/PPT/ODF). Infra change.
2. **Lighter partial** — `mammoth` (DOCX→HTML→PDF) + `xlsx` (SheetJS) →
   Word/Excel only, small bundle, lower fidelity on complex layouts. Documented
   as partial. No PPT.
3. **Evidenced skip** — document Office→PDF as the one gap that fails the
   size/UX bar for a local-first tool.

Recommend surfacing #1's real cost (~300 MB + infra) to the owner before
committing, since the original "ship it" approval assumed ~100 MB and npm
install. All other sprint tracks proceed regardless — Office is the last phase.
