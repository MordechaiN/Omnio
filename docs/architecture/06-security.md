# Security Architecture

**Status:** Approved 2026-07-11 (M0 complete)

Omnio's core security problem is unusual and must be named plainly: **the product's whole purpose is feeding untrusted files to a stack of native binaries with long CVE histories** (FFmpeg, ImageMagick, Ghostscript, LibreOffice, poppler). Everything here follows from that.

## 1. Threat model (summary)

| Threat                                           | Vector                                 | Primary mitigations                                                                                                                           |
| ------------------------------------------------ | -------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------- |
| Malicious file exploits a processing binary      | crafted PDF/image/video                | worker sandbox (§2), hardened tool configs, magic-byte validation, per-job limits                                                             |
| Compromised worker pivots to the network/host    | post-exploit lateral movement          | no-network worker, non-root, read-only rootfs, least-priv DB creds, no secrets in worker env beyond queue/storage                             |
| Instance exposed to the internet unauthenticated | scanning bots                          | auth on by default (D2), rate limiting, no unauth mutating routes                                                                             |
| Decompression/processing bombs                   | zip bombs, pixel floods, huge inputs   | size caps pre- and post-decompress, pixel-count caps, wall-clock/CPU/mem limits per job                                                       |
| XSS via user content                             | rendered file previews (SVG, HTML, MD) | strict CSP, sandboxed iframes for HTML/SVG preview, sanitized MD rendering                                                                    |
| SSRF                                             | any URL-fetching tool                  | URL tools are an explicit opt-in capability; deny private/link-local ranges; FFmpeg protocol whitelist (`file` only)                          |
| Path traversal / injection                       | filenames, tool options                | storage keys are generated (never derived from filenames), `ctx.exec()` builds argv arrays (no shell), Zod-validated options                  |
| Supply chain                                     | deps, future plugins                   | lockfile + CI audit + pinned digests for base images; third-party plugins out-of-process only ([03-module-system.md](03-module-system.md) §6) |

## 2. The worker sandbox

The worker container is the blast zone, and it is built to be lost:

- **Non-root user, read-only root filesystem**, `no-new-privileges`, all capabilities dropped, default seccomp profile. Scratch is a size-capped tmpfs/volume mount — the only writable path.
- **No network** (compose `internal: true` network for worker↔redis/storage only; no egress). A worker that can't reach the internet can't exfiltrate.
- **Per-job resource limits** from the tool manifest, enforced by `ctx.exec()`: wall-clock timeout (kill -9 on breach), memory cap, max output bytes, niceness. One job's runaway transcode cannot starve the queue.
- **Per-job scratch directories**, created 0700, deleted in `finally` — success, failure, or crash-sweep.
- **Hardened tool configs baked into the image:** ImageMagick `policy.xml` (disable ghostscript-backed coders MVG/MSL/PS/EPS/PDF-via-IM, cap resources), Ghostscript `-dSAFER`, FFmpeg `-protocol_whitelist file,pipe`, LibreOffice headless with no macros and no network.
- **`ctx.exec()` is the only subprocess API** exposed to module code — argv arrays only, environment scrubbed, cwd pinned to job scratch. There is no `child_process` import path that passes lint in `packages/modules`.

Post-v1 hardening ladder (documented so it's a plan, not a hope): gVisor/Kata runtime option → per-capability worker images (the PDF worker has no FFmpeg) → per-job microVMs for the third-party plugin lane.

## 3. File handling rules

1. **Validate before anything touches the file:** size cap → extension↔MIME consistency → magic-byte sniff. Reject on any disagreement; the error names the mismatch.
2. **Filenames are display metadata only.** Storage keys are generated ULIDs; original names are stored as strings, sanitized on the way out (Content-Disposition encoding).
3. **Downloads are Content-Disposition: attachment** with correct MIME; user HTML/SVG is never served same-origin inline (preview via sandboxed iframe with a null-origin blob, or rasterized).
4. **Archive extraction** enforces entry-count, per-entry and total-size ceilings, rejects absolute paths and `..` entries and symlinks.
5. **TTL sweeper** removes expired scratch objects and their DB rows; deletion is verified, orphans logged.
6. **Optional ClamAV** integration (off by default, admin-enabled) for instances that accept public uploads.

## 4. Web/API security

- **Auth (D2, reversed 2026-07-18):** `OMNIO_MODE=personal` (default) — no accounts, no login, a singleton implicit user; always prints a loud boot warning. `OMNIO_MODE=multi-user` — single-admin account, Argon2id password hashing, server-side sessions in httpOnly, `SameSite=Lax`, `Secure` cookies, session rotation on login, constant-time comparisons.
- **CSRF:** SameSite cookies + origin-check middleware on mutations (belt and suspenders; no token dance needed for same-origin SPA).
- **Rate limiting:** Redis-backed, per-session and per-IP, tiered (auth endpoints strictest, job creation next, reads loosest). 429s carry Retry-After.
- **CSP:** nonce-based strict policy — `default-src 'self'`; no `unsafe-inline` scripts; `frame-src` only for the sandboxed preview origin; `connect-src 'self'`. WASM enabled via `wasm-unsafe-eval` only (needed for browser-tier codecs, documented tradeoff).
- **Headers:** HSTS (when TLS), `X-Content-Type-Options: nosniff`, `Referrer-Policy: no-referrer`, `Permissions-Policy` minimal, COOP/COEP where SharedArrayBuffer is needed (ffmpeg.wasm threading).
- **Validation everywhere:** every request body/param/query passes the contracts' Zod schemas in NestJS pipes; unknown keys stripped; errors are structured and never echo raw input.
- **Audit log:** append-only table — logins (success/fail), settings changes, module enable/disable, destructive file ops, admin actions. Viewable in admin, exportable.

## 5. Secrets & config

- Secrets only via environment (compose `.env` / secrets); never in the DB, never logged (pino redaction paths), never sent to the client.
- Zod-validated config at boot; missing/weak values (e.g. default session secret) refuse startup in production mode.
- Postgres/Redis are on the internal network only — never published ports in the production compose file.

## 6. Disclosure

[`SECURITY.md`](../../SECURITY.md) at repo root: private reporting via GitHub Security Advisories, 90-day coordinated disclosure, supported-versions table.
