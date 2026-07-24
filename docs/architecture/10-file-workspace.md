# File Workspace — architecture

Status: proposed (M18). Scope: the permanent data model, the storage model, and
how the existing ~100 tools integrate. Interaction design is deliberately out of
scope here.

## 1. The problem

Every tool today is an island. A file enters through a drop zone, is handed to
one tool through an in-memory one-shot (`module-sdk/pending-file.ts`), and is
gone the moment that tool is done. There is no "the file I was just working on",
no way to send a result into the next tool without a round trip through the
downloads folder, and nothing to search.

The File Workspace makes a file a first-class, durable object that tools operate
*on*, rather than a transient input each tool receives separately.

## 2. Non-negotiable constraints

1. **Local-first.** Omnio's claim is that your files stay on your device. The
   workspace must not become a reason to upload. Server storage stays opt-in and
   is used only where a tool already requires it (the server tier, e.g. Office
   conversion).
2. **No rewrite of ~100 tools.** Any design requiring every tool to be touched
   is rejected on cost alone.
3. **Survives a reload.** A workspace that empties on refresh is a worse version
   of what exists now.
4. **Bounded.** Browser storage is finite; the model must express eviction from
   the start rather than bolting it on after users lose data.

## 3. Storage model

Two browser-side stores, split by what each is good at:

| Store | Holds | Why |
|---|---|---|
| **OPFS** (Origin Private File System) | file bytes | Real files, no practical size ceiling, streaming reads, no base64 inflation. Same-origin and invisible to other sites. |
| **IndexedDB** | metadata, tags, history, index | Queryable and transactional; OPFS has no index. |

Bytes and metadata are therefore separable: metadata is small and always loaded,
bytes are loaded on demand. A thumbnail is derived data and lives in IndexedDB as
a blob next to the metadata, so a grid of 500 files never opens 500 OPFS handles.

**Why not IndexedDB for bytes.** It works, but stores blobs opaquely, inflates
memory on read, and makes streaming a large PDF awkward. OPFS is the purpose-built
answer and is available in every browser Omnio targets.

**Why not the server by default.** It would silently break the local-first
promise for every tool that currently never uploads. Server storage already
exists (`FileObject`) for the job pipeline and keeps that role: a workspace file
is *promoted* to a `FileObject` only when a server-tier tool needs it, and the
workspace records that promotion so the user can see the file left the device.

## 4. Data model

The permanent shapes. These are the ones that are expensive to change later;
everything else is derived.

```ts
/** A file the user is working with. Bytes live in OPFS at `blobPath`. */
interface WorkspaceFile {
  id: string;              // ULID — sorts by creation time
  name: string;            // display name; user-renameable
  mime: string;
  size: number;
  hash: string;            // SHA-256 of the bytes; the identity of the content
  blobPath: string;        // OPFS path, derived from hash (content-addressed)
  createdAt: number;
  lastOpenedAt: number;    // drives "Recent"
  pinned: boolean;
  tagIds: string[];
  /** Provenance: which file and tool produced this one. */
  derivedFrom?: { fileId: string; toolId: string };
  /** Set once promoted to server storage for a server-tier tool. */
  remote?: { fileObjectId: string; promotedAt: number };
}

interface WorkspaceTag {
  id: string;
  name: string;
  color: string;
}

/** Append-only; the audit trail behind "History" and provenance. */
interface WorkspaceEvent {
  id: string;
  fileId: string;
  type: "imported" | "opened" | "produced" | "renamed" | "deleted" | "promoted";
  toolId?: string;
  at: number;
}
```

**Content addressing is the load-bearing decision.** `blobPath` derives from
`hash`, so identical bytes are stored once no matter how many times they are
imported. This gives duplicate detection for free — duplicates are files sharing
a hash, not a fuzzy comparison — and makes "produced by a tool" cheap when a tool
is a no-op. Deleting a `WorkspaceFile` deletes its blob only when no other row
references that hash.

**`derivedFrom` is what makes this a workspace rather than a folder.** It is how
the UI can show "this PDF came from that scan, via OCR", and how a future
workflow engine can replay a chain.

## 5. How existing tools integrate

The whole design turns on one observation: tools do not know where their input
came from. They call

```ts
const files = takePendingFiles();   // File[] | null
```

and open whatever they get. `File` is a plain web type. So the workspace hands
back real `File` objects reconstructed from OPFS, and **every existing tool works
unchanged**. Opening a workspace file into a tool is the existing hand-off with a
durable source behind it.

Three levels of integration, adopted incrementally:

- **Level 0 — free, no code.** A workspace file opens in any tool. Already true
  once the workspace populates the hand-off. All ~100 tools land here on day one.
- **Level 1 — one line.** A tool reports its output back instead of only
  triggering a download:
  ```ts
  await workspace.produce(bytes, { name, mime, from: fileId, toolId });
  ```
  Results then chain without touching the filesystem. Rolled out tool by tool,
  starting with the PDF suite. Download remains; this is additive.
- **Level 2 — opt-in.** Tools that want it declare accepted types in
  `module.json` (the `accepts` field already exists and already carries mime +
  priority), so the workspace can offer "open with" suggestions for a file. No
  new manifest concept is required.

Nothing above is a breaking change; a tool that never adopts Level 1 keeps
working exactly as it does today.

## 6. Eviction and limits

`navigator.storage.estimate()` gives the budget. The workspace enforces a
soft cap (default 2 GB, user-adjustable) with LRU eviction over
`lastOpenedAt`, and **never evicts pinned files**. Eviction removes bytes, not
metadata: an evicted file remains visible with its history and can be re-imported,
rather than vanishing silently. `navigator.storage.persist()` is requested on
first use so the browser does not clear the workspace under pressure.

## 7. Deliberately out of scope for v1

- Sync between devices, and any multi-user notion. Single device, single user.
- Folders. Tags plus search cover the same ground without a hierarchy to
  maintain; folders can be added later as a saved-search view.
- Full-text search *inside* documents. Search covers names, tags and types.
  Content search needs an index per file type and is its own milestone.
- Server-side workspace mirroring.

## 8. Risks

- **OPFS in private browsing** is restricted or absent in some browsers. The
  workspace must detect this at startup and degrade to the current ephemeral
  hand-off with a plain explanation, not fail.
- **Storage eviction by the browser** remains possible even with `persist()`.
  Anything the user has not exported is, ultimately, a cache. The UI must never
  imply the workspace is a backup.
- **Hash cost on import.** SHA-256 of a large file blocks; it runs in a worker,
  with the file usable before hashing completes (dedupe resolves after).
