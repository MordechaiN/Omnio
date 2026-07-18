# Security Policy

Omnio's entire purpose is processing untrusted files on hardware its users own. We take that responsibility seriously — the platform's threat model and hardening design are public in [docs/architecture/06-security.md](docs/architecture/06-security.md).

## Reporting a vulnerability

**Please do not open a public issue for security problems.**

Report privately via [GitHub Security Advisories](https://github.com/MordechaiN/Omnio/security/advisories/new) ("Report a vulnerability"). Include reproduction steps, the deployment configuration involved, and impact as you understand it.

What to expect:

- Acknowledgement within **72 hours**.
- An assessment and remediation plan within **14 days**.
- Coordinated disclosure: we ask for up to **90 days** before public details, and we credit reporters in the advisory unless you prefer otherwise.

## Supported versions

Until 1.0, only the latest release receives security fixes. From 1.0 onward, the latest minor of the current major is supported.

## Scope notes

- Vulnerabilities in bundled third-party processing tools (FFmpeg, ImageMagick, Ghostscript, …) are in scope when Omnio's sandboxing or configuration fails to contain them — that containment is our job.
- `OMNIO_MODE=personal` deployments (the default) intentionally disable authentication; reports that assume that mode are out of scope unless they escape its documented constraints.
