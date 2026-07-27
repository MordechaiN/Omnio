# Trust boundaries and resilience

Companion to `security-audit-2026-07.md`. That document asks whether Omnio can
be attacked. This one asks a different question: **when something goes wrong,
can you lose work?**

The tests below were run against a production build, by breaking the browser
underneath a running Omnio.

---

## Trust boundaries

| Boundary | Trusted | Untrusted | Validated by | If it fails |
|---|---|---|---|---|
| **Drag & drop / paste** | nothing | bytes, filename, declared MIME | type sniffed from content, not the name; clipboard takes only `kind === "file"` | file is not kept, and now says so |
| **File import** | own hash | the file | SHA-256 addresses the bytes; identical content stored once | write error surfaces; original untouched |
| **Archive handling** | nothing | entry names, declared sizes | expansion read from the directory without inflating; names collected into an array, never object keys | refused before memory is touched |
| **PDF / image / OCR** | nothing | file internals | delegated to pdf.js, mupdf, tesseract, platform decoders — all sandboxed | tool reports failure; workspace unaffected |
| **Thumbnails** | nothing | file internals | render failure returns null | generic icon, nothing else changes |
| **Markdown preview** | nothing | the document | escape first, emit a fixed tag set (19-payload battery) | inert text |
| **HTML preview** | nothing | the document | sandboxed iframe, never `allow-same-origin` | opaque origin cannot reach the workspace |
| **OPFS** | own hashes | nothing | paths are hex digests; filenames never touch a path | traversal impossible by construction |
| **IndexedDB** | own records | nothing (records are self-written) | probe cannot throw; unsupported state is a first-class screen | honest "can't store files here" screen |
| **Workspace import** | nothing | the entire archive | expansion ceiling, manifest shape checked before use | returns false; existing workspace untouched |
| **Workspace export** | own records | nothing | filename stripped to `[\w.-]` | download simply does not start |
| **Backend** | nothing | responses | response bodies parsed against the contract | falls to the page's error state, never a crash |
| **Download pipeline** | own bytes | filename | browser refuses path separators in `download` | file lands with a flattened name |

The recurring pattern: **Omnio trusts only what it computed itself** — hashes,
its own records, its own manifest. Everything that arrived from outside is
treated as a claim, not a fact.

---

## Resilience testing

Each failure was injected into a running production build.

| Simulated | Result |
|---|---|
| IndexedDB blocked entirely | Honest screen: "Files can't be stored in this browser." **0 uncaught errors** (was 1 — fixed, see below) |
| OPFS refused | App fully usable; tools work on the file in hand |
| Quota exceeded mid-import | No crash; **the person is told the file was not kept**; the very next import after space is freed succeeds |
| Refresh during an import | No orphan record — every stored record's bytes were present. A file either exists completely or not at all |
| Corrupt / malformed archive | Import returns false, existing workspace untouched |

### Weaknesses found and fixed

1. **Storage failures were silent.** A drop looked like it worked: the panel
   opened, the tools ran, and Files still read "no files yet". Someone would
   believe a document was safely in Omnio when it had never arrived. The failure
   is now reported, while the drop still proceeds — the tools work on the file
   in hand regardless, so only the part that actually failed is mentioned.

2. **Probing for IndexedDB could throw.** In locked-down modes the global is a
   getter that raises `SecurityError`, so `typeof indexedDB` took the workspace
   down with an uncaught error. Storage being refused is a state Omnio handles;
   discovering it should not itself be a failure.

### Why work cannot be silently lost

- **Content addressing.** Bytes are written under their own SHA-256 before any
  record refers to them. A record can only ever point at content that was
  already stored, so a half-finished import leaves an unreferenced blob — waste,
  never a broken file.
- **The original is never touched.** Omnio copies; it does not move or consume.
  A failed import costs nothing, because the file is still wherever it was.
- **Deletion is the only destructive act**, and it is undoable — the bytes are
  copied into memory *before* removal, precisely because an OPFS handle is a
  live reference rather than a snapshot.
- **Archiving is the one irreversible act**, and it says so before the click.

---

## Remaining recommendation

Interrupting a write mid-flight was tested by reloading during an import and
found clean, but that is one timing sample rather than a proof. A deterministic
test that suspends the write at a chosen point would turn this from evidence
into a guarantee.
