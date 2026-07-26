"use client";

import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { getThumb, putThumb } from "./db.ts";
import {
  ancestryOf,
  relationsOf,
  searchFiles,
  sortFiles,
  type Relations,
  type SearchQuery,
  type SortKey,
  type WorkspaceFile,
} from "./model.ts";
import { workspace, type WorkspaceSnapshot } from "./store.ts";

/**
 * React bindings for the workspace store.
 *
 * The store serves a synchronous snapshot, so these hooks never introduce a
 * loading state of their own — components render real data on first paint.
 */

export function useWorkspace(): WorkspaceSnapshot {
  const snapshot = useSyncExternalStore(workspace.subscribe, workspace.getSnapshot, workspace.getSnapshot);
  useEffect(() => {
    void workspace.load();
  }, []);
  return snapshot;
}

/** A filtered, sorted view. Memoized so typing in search does not re-sort. */
export function useFileView(query: SearchQuery, sort: SortKey): WorkspaceFile[] {
  const { files } = useWorkspace();
  const key = JSON.stringify(query);
  return useMemo(
    () => sortFiles(searchFiles(files, JSON.parse(key) as SearchQuery), sort),
    [files, key, sort],
  );
}

export function useFile(id: string | null): WorkspaceFile | null {
  const { files } = useWorkspace();
  return useMemo(() => (id ? files.find((f) => f.id === id) ?? null : null), [files, id]);
}

export function useRelations(file: WorkspaceFile | null): Relations & { ancestry: WorkspaceFile[] } {
  const { files } = useWorkspace();
  return useMemo(() => {
    if (!file) return { parent: null, children: [], siblings: [], ancestry: [] };
    return { ...relationsOf(file, files), ancestry: ancestryOf(file, files) };
  }, [file, files]);
}

/**
 * A cached object URL for a file's thumbnail, generating it on first need.
 *
 * Thumbnails are persisted, so a returning user sees a populated grid instantly
 * rather than re-rendering every preview. Generation is skipped entirely for
 * types we cannot cheaply rasterize here — PDFs get theirs from the pdfkit
 * renderer, which already has pdf.js loaded.
 */
export function useThumbnail(file: WorkspaceFile | null): string | null {
  const [url, setUrl] = useState<string | null>(null);
  const revoke = useRef<string | null>(null);

  // Depend on stable primitives, never the file object. Every workspace commit
  // (an appended event, a touched lastOpenedAt) produces a new object with the
  // same content; keying on identity made this effect revoke its own object URL
  // mid-flight, leaving a broken image behind.
  const id = file?.id ?? null;
  const hash = file?.hash ?? null;
  const mime = file?.mime ?? null;
  const evicted = file?.evicted ?? false;
  // A primitive, like the rest: depending on `file.facts` would re-run this
  // effect on every unrelated workspace commit.
  const needsFacts = file?.facts === undefined;

  useEffect(() => {
    let cancelled = false;
    if (revoke.current) {
      URL.revokeObjectURL(revoke.current);
      revoke.current = null;
    }
    setUrl(null);
    if (!id || !hash || !mime || evicted) return undefined;

    const show = (blob: Blob) => {
      if (cancelled) return;
      const objectUrl = URL.createObjectURL(blob);
      revoke.current = objectUrl;
      setUrl(objectUrl);
    };

    void (async () => {
      const isImage = mime.startsWith("image/");
      const existing = await getThumb(id);
      if (cancelled) return;
      if (existing) {
        show(existing.blob);
        // Thumbnails are cached, so this is the only chance to fill in the
        // dimensions of images that predate them being recorded at all.
        if (isImage && needsFacts) await recordImageFacts(id);
        return;
      }
      const source = await workspace.peekFile(id);
      if (!source || cancelled) return;
      // Kept separate from the generic thumbnail so the image's own dimensions
      // stay typed rather than being narrowed back out of a union.
      const imageThumb = isImage ? await makeImageThumb(source) : null;
      const thumb =
        imageThumb ??
        (mime === "application/pdf" ? ((await pdfThumbnailer?.(source, id)) ?? null) : null);
      if (!thumb || cancelled) return;
      await putThumb({ fileId: id, blob: thumb.blob, width: thumb.width, height: thumb.height });
      // Free: the decode already happened to build the thumbnail.
      if (imageThumb && needsFacts) {
        await workspace.setFacts(id, {
          kind: "image",
          width: imageThumb.sourceWidth,
          height: imageThumb.sourceHeight,
        });
      }
      show(thumb.blob);
    })();

    return () => {
      cancelled = true;
    };
  }, [id, hash, mime, evicted, needsFacts]);

  useEffect(
    () => () => {
      if (revoke.current) URL.revokeObjectURL(revoke.current);
    },
    [],
  );

  return url;
}

const THUMB_MAX = 320;

/**
 * Rendering a PDF page needs pdf.js, which is far too heavy to pull into this
 * package for every consumer. The app registers a renderer instead, so the
 * workspace stays engine-free and a host without pdf.js simply gets no PDF
 * thumbnail rather than a broken import.
 */
type Thumbnailer = (
  file: File,
  fileId?: string,
) => Promise<{ blob: Blob; width: number; height: number } | null>;

let pdfThumbnailer: Thumbnailer | null = null;

export function registerPdfThumbnailer(render: Thumbnailer): void {
  pdfThumbnailer = render;
}

async function makeImageThumb(source: File): Promise<{
  blob: Blob;
  width: number;
  height: number;
  /** The original image's size, which is what the Inspector and insights mean. */
  sourceWidth: number;
  sourceHeight: number;
} | null> {
  try {
    const bitmap = await createImageBitmap(source);
    const sourceWidth = bitmap.width;
    const sourceHeight = bitmap.height;
    const scale = Math.min(1, THUMB_MAX / Math.max(sourceWidth, sourceHeight));
    const width = Math.max(1, Math.round(sourceWidth * scale));
    const height = Math.max(1, Math.round(sourceHeight * scale));
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    canvas.getContext("2d")?.drawImage(bitmap, 0, 0, width, height);
    bitmap.close();
    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, "image/webp", 0.8),
    );
    return blob ? { blob, width, height, sourceWidth, sourceHeight } : null;
  } catch {
    return null;
  }
}

/**
 * Read an image's real dimensions and record them.
 *
 * Nothing populated image facts: `setFacts` was called from exactly one place,
 * the PDF thumbnailer. Every image in every real workspace therefore had none,
 * which quietly disabled the "much larger than any screen will show" insight and
 * the "one picture, several sizes" discovery — both of which read
 * `facts.kind === "image"`. They passed their tests because the fixtures set
 * facts by hand; no imported file ever did.
 *
 * Used to backfill images whose thumbnail was cached before this existed.
 */
async function recordImageFacts(id: string): Promise<void> {
  const source = await workspace.peekFile(id);
  if (!source) return;
  try {
    const bitmap = await createImageBitmap(source);
    const facts = { kind: "image" as const, width: bitmap.width, height: bitmap.height };
    bitmap.close();
    await workspace.setFacts(id, facts);
  } catch {
    // Not a decodable image after all — a mislabelled or truncated file. The
    // workspace keeps it; it simply has nothing type-specific to say about it.
  }
}

/**
 * Multi-select with the conventions every desktop file manager shares:
 * plain click replaces, Ctrl/Cmd toggles, Shift extends from the anchor.
 */
export function useSelection(ordered: WorkspaceFile[]) {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [anchor, setAnchor] = useState<string | null>(null);

  const select = useCallback(
    (id: string, modifiers: { ctrl?: boolean; shift?: boolean } = {}) => {
      if (modifiers.shift && anchor) {
        const a = ordered.findIndex((f) => f.id === anchor);
        const b = ordered.findIndex((f) => f.id === id);
        if (a >= 0 && b >= 0) {
          const range = ordered.slice(Math.min(a, b), Math.max(a, b) + 1).map((f) => f.id);
          setSelected(new Set(range));
          return;
        }
      }
      if (modifiers.ctrl) {
        setSelected((current) => {
          const next = new Set(current);
          if (next.has(id)) next.delete(id);
          else next.add(id);
          return next;
        });
        setAnchor(id);
        return;
      }
      setSelected(new Set([id]));
      setAnchor(id);
    },
    [anchor, ordered],
  );

  const selectAll = useCallback(() => setSelected(new Set(ordered.map((f) => f.id))), [ordered]);
  const clear = useCallback(() => setSelected(new Set()), []);

  // Drop ids that no longer exist, so a delete cannot leave a phantom selection.
  useEffect(() => {
    setSelected((current) => {
      const live = new Set(ordered.map((f) => f.id));
      if ([...current].every((id) => live.has(id))) return current;
      return new Set([...current].filter((id) => live.has(id)));
    });
  }, [ordered]);

  return { selected, anchor, select, selectAll, clear, setSelected };
}
