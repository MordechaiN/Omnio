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

  useEffect(() => {
    let cancelled = false;
    if (revoke.current) {
      URL.revokeObjectURL(revoke.current);
      revoke.current = null;
    }
    setUrl(null);
    if (!file || file.evicted) return undefined;

    void (async () => {
      const existing = await getThumb(file.id);
      if (cancelled) return;
      if (existing) {
        const objectUrl = URL.createObjectURL(existing.blob);
        revoke.current = objectUrl;
        setUrl(objectUrl);
        return;
      }
      if (!file.mime.startsWith("image/")) return;
      const source = await workspace.peekFile(file.id);
      if (!source || cancelled) return;
      const thumb = await makeImageThumb(source);
      if (!thumb || cancelled) return;
      await putThumb({ fileId: file.id, blob: thumb.blob, width: thumb.width, height: thumb.height });
      if (cancelled) return;
      const objectUrl = URL.createObjectURL(thumb.blob);
      revoke.current = objectUrl;
      setUrl(objectUrl);
    })();

    return () => {
      cancelled = true;
    };
  }, [file]);

  useEffect(
    () => () => {
      if (revoke.current) URL.revokeObjectURL(revoke.current);
    },
    [],
  );

  return url;
}

const THUMB_MAX = 320;

async function makeImageThumb(
  source: File,
): Promise<{ blob: Blob; width: number; height: number } | null> {
  try {
    const bitmap = await createImageBitmap(source);
    const scale = Math.min(1, THUMB_MAX / Math.max(bitmap.width, bitmap.height));
    const width = Math.max(1, Math.round(bitmap.width * scale));
    const height = Math.max(1, Math.round(bitmap.height * scale));
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    canvas.getContext("2d")?.drawImage(bitmap, 0, 0, width, height);
    bitmap.close();
    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, "image/webp", 0.8),
    );
    return blob ? { blob, width, height } : null;
  } catch {
    return null;
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
