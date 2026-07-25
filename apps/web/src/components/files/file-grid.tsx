"use client";

import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { kindOf, type WorkspaceFile } from "@omnio/workspace";
import { useThumbnail } from "@omnio/workspace/react";
import { FileArchive, FileAudio, FileText, FileVideo, Image as ImageIcon, Pin } from "lucide-react";
import { cn } from "@omnio/ui";

/**
 * Virtualized file grid.
 *
 * Only the rows intersecting the viewport are mounted, so a workspace holding
 * thousands of files costs the same to render as one holding twenty. The grid
 * is a fixed tile size, which makes the row maths exact and avoids the
 * measure-then-reflow pass a variable-height virtualizer needs.
 */

/** Thumbnail sizes, mirroring the small/medium/large of a desktop file manager. */
export type ThumbSize = "s" | "m" | "l";
export type ViewMode = "grid" | "list";

const TILE: Record<ThumbSize, { w: number; h: number; thumb: number }> = {
  s: { w: 120, h: 138, thumb: 88 },
  m: { w: 168, h: 188, thumb: 128 },
  l: { w: 232, h: 258, thumb: 190 },
};
const ROW_HEIGHT = 40;
const GAP = 12;
/** Rows rendered beyond the viewport, so scrolling never shows a blank band. */
const OVERSCAN = 2;

const KIND_ICON = {
  image: ImageIcon,
  pdf: FileText,
  text: FileText,
  audio: FileAudio,
  video: FileVideo,
  archive: FileArchive,
  other: FileText,
} as const;

export interface FileGridProps {
  files: WorkspaceFile[];
  view: ViewMode;
  size: ThumbSize;
  selected: Set<string>;
  focusedId: string | null;
  onSelect: (id: string, modifiers: { ctrl?: boolean; shift?: boolean }) => void;
  onActivate: (id: string) => void;
  onContextMenu: (id: string, at: { x: number; y: number }) => void;
  onDropOnFile?: (draggedIds: string[], targetId: string) => void;
}

export function FileGrid({
  files,
  view,
  size,
  selected,
  focusedId,
  onSelect,
  onActivate,
  onContextMenu,
  onDropOnFile,
}: FileGridProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [viewport, setViewport] = useState({ width: 0, height: 0, scrollTop: 0 });

  // Track size and scroll without re-rendering on every pixel: state updates
  // only when the derived row window would actually change.
  useLayoutEffect(() => {
    const element = scrollRef.current;
    if (!element) return undefined;
    const measure = () =>
      setViewport((current) => {
        const next = {
          width: element.clientWidth,
          height: element.clientHeight,
          scrollTop: element.scrollTop,
        };
        return current.width === next.width &&
          current.height === next.height &&
          current.scrollTop === next.scrollTop
          ? current
          : next;
      });
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(element);
    element.addEventListener("scroll", measure, { passive: true });
    return () => {
      observer.disconnect();
      element.removeEventListener("scroll", measure);
    };
  }, []);

  const isList = view === "list";
  const metrics = TILE[size];
  // List view is a single column of short rows; grid packs as many tiles as fit.
  const columns = isList
    ? 1
    : Math.max(1, Math.floor((viewport.width + GAP) / (metrics.w + GAP)));
  const rows = Math.ceil(files.length / columns);
  const rowHeight = isList ? ROW_HEIGHT : metrics.h + GAP;
  const firstRow = Math.max(0, Math.floor(viewport.scrollTop / rowHeight) - OVERSCAN);
  const visibleRows = Math.ceil(viewport.height / rowHeight) + OVERSCAN * 2;
  const lastRow = Math.min(rows, firstRow + visibleRows);

  const slice = useMemo(
    () => files.slice(firstRow * columns, lastRow * columns),
    [files, firstRow, lastRow, columns],
  );

  // Keep the focused tile on screen when navigating by keyboard.
  useEffect(() => {
    if (!focusedId || !scrollRef.current) return;
    const index = files.findIndex((f) => f.id === focusedId);
    if (index < 0) return;
    const row = Math.floor(index / columns);
    const top = row * rowHeight;
    const element = scrollRef.current;
    const itemHeight = isList ? ROW_HEIGHT : metrics.h;
    if (top < element.scrollTop) element.scrollTo({ top, behavior: "smooth" });
    else if (top + itemHeight > element.scrollTop + element.clientHeight) {
      element.scrollTo({ top: top + itemHeight - element.clientHeight, behavior: "smooth" });
    }
  }, [focusedId, files, columns, rowHeight, isList, metrics.h]);

  return (
    <div ref={scrollRef} className="h-full overflow-auto p-3" data-testid="file-grid">
      <div style={{ height: rows * rowHeight }} className="relative">
        <div
          className="absolute inset-x-0 grid"
          style={{
            top: firstRow * rowHeight,
            gridTemplateColumns: isList ? "1fr" : `repeat(${columns}, ${metrics.w}px)`,
            gap: isList ? 0 : GAP,
            justifyContent: "start",
          }}
        >
          {slice.map((file) => (
            <FileTile
              key={file.id}
              file={file}
              view={view}
              metrics={metrics}
              selected={selected.has(file.id)}
              focused={focusedId === file.id}
              allSelected={selected}
              onSelect={onSelect}
              onActivate={onActivate}
              onContextMenu={onContextMenu}
              onDropOnFile={onDropOnFile}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

function FileTile({
  file,
  view,
  metrics,
  selected,
  focused,
  allSelected,
  onSelect,
  onActivate,
  onContextMenu,
  onDropOnFile,
}: {
  file: WorkspaceFile;
  view: ViewMode;
  metrics: { w: number; h: number; thumb: number };
  selected: boolean;
  focused: boolean;
  allSelected: Set<string>;
  onSelect: FileGridProps["onSelect"];
  onActivate: FileGridProps["onActivate"];
  onContextMenu: FileGridProps["onContextMenu"];
  onDropOnFile?: FileGridProps["onDropOnFile"];
}) {
  const t = useTranslations("files");
  const thumb = useThumbnail(file);
  const [dropTarget, setDropTarget] = useState(false);
  const Icon = KIND_ICON[kindOf(file.mime) as keyof typeof KIND_ICON] ?? FileText;

  return (
    <button
      type="button"
      draggable
      data-file-id={file.id}
      aria-pressed={selected}
      aria-label={file.name}
      onClick={(e) => onSelect(file.id, { ctrl: e.ctrlKey || e.metaKey, shift: e.shiftKey })}
      onDoubleClick={() => onActivate(file.id)}
      onContextMenu={(e) => {
        e.preventDefault();
        if (!selected) onSelect(file.id, {});
        onContextMenu(file.id, { x: e.clientX, y: e.clientY });
      }}
      onDragStart={(e) => {
        // Dragging an unselected tile acts on that tile alone, matching Finder.
        const ids = selected ? [...allSelected] : [file.id];
        e.dataTransfer.setData("application/x-omnio-files", JSON.stringify(ids));
        e.dataTransfer.effectAllowed = "copyMove";
      }}
      onDragOver={(e) => {
        if (!e.dataTransfer.types.includes("application/x-omnio-files")) return;
        e.preventDefault();
        setDropTarget(true);
      }}
      onDragLeave={() => setDropTarget(false)}
      onDrop={(e) => {
        setDropTarget(false);
        const raw = e.dataTransfer.getData("application/x-omnio-files");
        if (!raw) return;
        e.preventDefault();
        const ids = (JSON.parse(raw) as string[]).filter((id) => id !== file.id);
        if (ids.length > 0) onDropOnFile?.(ids, file.id);
      }}
      className={cn(
        "group relative border transition-[background-color,border-color,box-shadow]",
        "motion-safe:duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent",
        view === "list"
          ? "flex w-full items-center gap-3 rounded-md px-2 py-1.5 text-start"
          : "flex flex-col items-center gap-2 rounded-lg p-2 text-center",
        selected ? "border-accent bg-accent/10" : "border-transparent hover:bg-surface-hover",
        focused && !selected ? "ring-1 ring-border" : "",
        dropTarget ? "border-dashed border-accent bg-accent/5" : "",
      )}
      style={view === "list" ? undefined : { width: metrics.w, height: metrics.h }}
    >
      {view === "list" ? (
        <>
          {thumb ? (
            <img src={thumb} alt="" loading="lazy" className="h-7 w-7 shrink-0 rounded object-cover" />
          ) : (
            <Icon className="h-5 w-5 shrink-0 text-text-muted" aria-hidden />
          )}
          <span className="min-w-0 flex-1 truncate text-sm">{file.name}</span>
          <span className="shrink-0 text-xs tabular-nums text-text-muted">{formatBytes(file.size)}</span>
          {file.pinned ? <Pin className="h-3.5 w-3.5 shrink-0 text-accent" aria-label={t("pinned")} /> : null}
        </>
      ) : (
        <>
          <span
            className="flex w-full items-center justify-center overflow-hidden rounded-md bg-surface-subtle"
            style={{ height: metrics.thumb }}
          >
            {thumb ? (
              <img
                src={thumb}
                alt=""
                loading="lazy"
                className="max-h-full max-w-full object-contain motion-safe:animate-in motion-safe:fade-in motion-safe:duration-200"
              />
            ) : (
              <Icon className="h-10 w-10 text-text-muted" aria-hidden />
            )}
          </span>
          <span className="line-clamp-2 w-full break-words text-xs leading-tight">{file.name}</span>
          {file.pinned ? (
            <Pin className="absolute end-1.5 top-1.5 h-3.5 w-3.5 text-accent" aria-label={t("pinned")} />
          ) : null}
          {file.evicted ? (
            <span className="absolute start-1.5 top-1.5 rounded bg-surface px-1 text-[10px] text-text-muted">
              {t("evicted")}
            </span>
          ) : null}
        </>
      )}
    </button>
  );
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
