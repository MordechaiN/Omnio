# Temporary Share — design contract (own milestone)

Status: **planned, not built.** Captured before M17 per owner direction.

## Framing (corrected)

Temporary Share is **not a cloud product** and must not be designed as one.
Omnio already runs on a server; Temporary Share is simply an **optional
capability** of that same instance. The default Omnio philosophy stays
**local-first**: nothing uploads unless the user explicitly chooses
"Share temporarily" on a specific file, that one time.

## Non-negotiable design goals

- **Disabled by default.** The capability is off until an operator/user turns
  it on. No share surface, no endpoints active, when disabled.
- **Explicit user action.** Sharing happens only when the user clicks
  "Share temporarily" for a chosen file. Never automatic, never a default
  destination.
- **Temporary + auto expiration.** Every share has an expiry; when it lapses
  the file is destroyed automatically (no manual cleanup required).
- **Optional password.** User may set one; enforced server-side.
- **Download counter.** Track and display how many times it was fetched.
- **Delete after first download.** Optional one-shot mode.
- **QR code.** Generated for the temporary link.
- **Search integration.** The action/tool is findable in global search only
  when the capability is enabled.
- **File Intelligence integration.** "Share temporarily" appears as a Smart
  Action only when the capability is enabled.

## UX honesty requirement

The share UI must state plainly, e.g. *"This file is temporarily available until
{expiration}."* The user must understand the file leaves their device for the
lifetime of the share, and that expiry/first-download destroys it.

## Platform / security constraints (from the platform contract)

- Public reachability is **opt-in and explicit**. Serving a shared file to the
  internet is a new exposure and gets a deliberate reachability review — routed
  via the shared reverse proxy/tunnel, not a newly published host port.
- Least privilege: share links are unguessable, scoped to one file, expiring.
- Cloud firewall state is assumed, not trusted — verify before relying on it.
- Auto-expiry deletion is the one destructive action allowed without a prior
  backup, because the file is by definition ephemeral and user-initiated; still
  destroy only the share copy, never the user's source.

## Rough build shape (for the milestone, not this pass)

- Prisma: `Share` model (id, fileRef, expiresAt, passwordHash?, maxDownloads?,
  downloadCount, deleteAfterFirst, createdAt).
- API (NestJS): create-share (auth'd), public download (rate-limited, password
  check, counter increment, one-shot delete), revoke.
- Worker (BullMQ): periodic sweep destroying expired/one-shot-consumed shares.
- Web: opt-in setting; share dialog (expiry, password, one-shot, QR, copy link);
  clear "temporarily available until …" copy.
- Registry: tool + `accepts` so search and File Intelligence pick it up **only
  when the capability flag is on**.
