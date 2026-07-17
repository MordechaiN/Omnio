# Technical Debt

Tracked debt from milestone reviews and the pre-alpha readiness review. Each item
has an owner milestone. Critical/High-severity items are fixed as they are found;
this file holds the deferred Medium/Low items so nothing is silent.

## Medium

- **Migration runner pulls the Prisma CLI into the api runtime image.**
  `deployMigrations()` shells `prisma migrate deploy` at boot, which requires the
  Prisma CLI at runtime. Works and is advisory-locked/multi-replica-safe, but
  bloats the image. _Owner: M9 (image hardening)._
- **Rate limiter is fail-open and per-instance.** Redis-backed fixed-window
  limiter fails open on a Redis outage and counts per instance; window boundaries
  permit short bursts. Acceptable for alpha. _Owner: post-alpha hardening._
- **Full nonce-based script CSP for the web tier.** The baseline security headers
  (incl. `frame-ancestors 'none'`) ship now; the strict `script-src` nonce policy
  (with `wasm-unsafe-eval` for browser-tier codecs and COOP/COEP where
  SharedArrayBuffer is needed) is a larger web-shell change. _Owner: M5/M6._

## Low

- **SSE opens a duplicated Redis connection per client.** Cleaned up on close and
  on terminal status, but heavy fan-out could accumulate connections. Revisit if
  concurrent job-watchers grow. _Owner: post-alpha._
- **Split-origin deployments require `OMNIO_ALLOWED_ORIGINS`.** When the web and
  api are served from different origins, the operator must set this for CORS +
  the CSRF origin check. Documented in `.env.example`. _Owner: docs/M9._
- **Palette search uses cmdk's built-in filter, not MiniSearch.** Fine at the
  current tool count; the entries are registry-shaped so it is a data swap.
  _Owner: M7._

## Resolved (pre-alpha)

- **Session-secret production check was incomplete** — production now refuses
  both the dev default and the `.env.example` placeholder. _(Alpha review.)_
- **Web tier shipped no security headers** — baseline headers added in
  `apps/web/next.config.ts`. _(Alpha review.)_
