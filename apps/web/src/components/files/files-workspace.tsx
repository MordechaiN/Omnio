"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { setPendingFiles } from "@omnio/module-sdk";
import {
  duplicateGroups,
  kindOf,
  searchFiles,
  sortFiles,
  workspace,
  type SortKey,
  type WorkspaceFile,
} from "@omnio/workspace";
import { useSelection, useWorkspace } from "@omnio/workspace/react";
import {
  Button,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  EmptyState,
  Input,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@omnio/ui";
import { FolderOpen, Search } from "lucide-react";
import { useRouter } from "@/i18n/navigation";
import { mimeMatches, normalizeMime } from "@/lib/file-intel";
import { SEARCH_ENTRIES } from "@/generated/registry.search";
import { FileGrid } from "./file-grid";
import { Inspector } from "./inspector";
import { QuickPreview } from "./quick-preview";

/** Tools that accept this file, best match first. */
function recommendationsFor(file: WorkspaceFile | null) {
  if (!file) return [];
  const mime = normalizeMime(file.mime, file.name);
  return SEARCH_ENTRIES.flatMap((entry) => {
    const accept = entry.accepts.find((a) => a.mime.some((p) => mimeMatches(p, mime)));
    return accept ? [{ entry, priority: accept.priority ?? 50 }] : [];
  })
    .sort((a, b) => b.priority - a.priority)
    .slice(0, 6);
}

export function FilesWorkspace() {
  const t = useTranslations("files");
  const tKind = useTranslations("files.kind");
  const tSort = useTranslations("files.sort");
  const router = useRouter();
  const { files, tags, collections, events, ready, supported } = useWorkspace();

  const [text, setText] = useState("");
  const [sort, setSort] = useState<SortKey>("recent");
  const [kind, setKind] = useState<string>("");
  const [collectionId] = useState<string>("");
  const [focusedId, setFocusedId] = useState<string | null>(null);
  const [menu, setMenu] = useState<{ id: string; x: number; y: number } | null>(null);
  const [previewId, setPreviewId] = useState<string | null>(null);
  const [undoable, setUndoable] = useState<Array<{ file: WorkspaceFile; blob: File }>>([]);
  const containerRef = useRef<HTMLDivElement>(null);

  const view = useMemo(
    () =>
      sortFiles(
        searchFiles(files, {
          text,
          kind: kind || undefined,
          collectionId: collectionId || undefined,
        }),
        sort,
      ),
    [files, text, kind, collectionId, sort],
  );

  const { selected, select, selectAll, clear } = useSelection(view);
  const activeId = focusedId && selected.has(focusedId) ? focusedId : [...selected][0] ?? null;
  const activeFile = useMemo(() => files.find((f) => f.id === activeId) ?? null, [files, activeId]);
  const recommendations = useMemo(() => recommendationsFor(activeFile), [activeFile]);

  const openWith = useCallback(
    async (href: string, fileId: string, toolId?: string) => {
      const handle = await workspace.openFile(fileId, toolId);
      if (!handle) return;
      setPendingFiles([handle]);
      router.push(href);
    },
    [router],
  );

  /** Enter / double-click: straight into the best-matching tool. */
  const activate = useCallback(
    (id: string) => {
      const file = files.find((f) => f.id === id);
      const best = recommendationsFor(file ?? null)[0];
      if (best) void openWith(best.entry.href, id, best.entry.toolId);
    },
    [files, openWith],
  );

  const removeSelected = useCallback(async () => {
    const doomed = [...selected]
      .map((id) => files.find((f) => f.id === id))
      .filter((f): f is WorkspaceFile => Boolean(f));
    // Copy the bytes into memory before deleting. A File handed back by OPFS is
    // a live reference, not a snapshot: once the blob is removed, reading it
    // throws NotFoundError and the undo would silently restore nothing.
    const saved: Array<{ file: WorkspaceFile; blob: File }> = [];
    for (const file of doomed) {
      const handle = await workspace.peekFile(file.id);
      if (!handle) continue;
      const bytes = await handle.arrayBuffer();
      saved.push({ file, blob: new File([bytes], file.name, { type: file.mime }) });
    }
    for (const file of doomed) await workspace.remove(file.id);
    setUndoable(saved);
    clear();
  }, [selected, files, clear]);

  const undoDelete = useCallback(async () => {
    for (const { blob } of undoable) await workspace.import(blob);
    setUndoable([]);
  }, [undoable]);

  /* ----------------------------------------------------------- keyboard */

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const target = e.target as HTMLElement | null;
      if (target && /^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName)) return;
      if (previewId && e.key !== "Escape" && e.key !== " ") return;

      const index = focusedId ? view.findIndex((f) => f.id === focusedId) : -1;
      const move = (delta: number) => {
        e.preventDefault();
        const next = view[Math.max(0, Math.min(view.length - 1, (index < 0 ? 0 : index) + delta))];
        if (next) {
          setFocusedId(next.id);
          select(next.id, { shift: e.shiftKey });
        }
      };

      switch (e.key) {
        case "ArrowRight":
          move(1);
          break;
        case "ArrowLeft":
          move(-1);
          break;
        case "ArrowDown":
          move(6);
          break;
        case "ArrowUp":
          move(-6);
          break;
        case " ":
          e.preventDefault();
          setPreviewId((current) => (current ? null : activeId));
          break;
        case "Enter":
          if (activeId) {
            e.preventDefault();
            activate(activeId);
          }
          break;
        case "Delete":
        case "Backspace":
          if (selected.size > 0) {
            e.preventDefault();
            void removeSelected();
          }
          break;
        case "Escape":
          setPreviewId(null);
          setMenu(null);
          clear();
          break;
        default:
          if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "a") {
            e.preventDefault();
            selectAll();
          } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "z" && undoable.length > 0) {
            e.preventDefault();
            void undoDelete();
          }
      }
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [view, focusedId, activeId, selected, previewId, undoable, select, selectAll, clear, activate, removeSelected, undoDelete]);

  /** Dropping files onto another file records the relationship. */
  const onDropOnFile = useCallback(async (draggedIds: string[], targetId: string) => {
    for (const id of draggedIds) {
      const file = files.find((f) => f.id === id);
      const target = files.find((f) => f.id === targetId);
      if (!file || !target || file.collectionIds.length > 0) continue;
      // Same content dropped together is almost always meant as a grouping.
      for (const collectionId of target.collectionIds) {
        await workspace.setCollection(id, collectionId, true);
      }
    }
  }, [files]);

  const duplicates = useMemo(() => duplicateGroups(files), [files]);

  if (ready && !supported) {
    return (
      <EmptyState
        title={t("unsupportedTitle")}
        description={t("unsupportedBody")}
        icon={FolderOpen}
      />
    );
  }

  return (
    <div ref={containerRef} className="flex h-[calc(100vh-8rem)] flex-col">
      <div className="flex flex-wrap items-center gap-2 border-b border-border-subtle p-3">
        <div className="relative min-w-48 flex-1">
          <Search className="pointer-events-none absolute start-2 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted" aria-hidden />
          <Input
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder={t("searchPlaceholder")}
            aria-label={t("searchPlaceholder")}
            className="ps-8"
          />
        </div>
        <Select value={kind || "all"} onValueChange={(v) => setKind(v === "all" ? "" : v)}>
          <SelectTrigger className="w-36" aria-label={t("filterKind")}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t("allKinds")}</SelectItem>
            {["pdf", "image", "text", "audio", "video", "archive", "other"].map((k) => (
              <SelectItem key={k} value={k}>
                {tKind(k as "other")}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={sort} onValueChange={(v) => setSort(v as SortKey)}>
          <SelectTrigger className="w-36" aria-label={t("sortBy")}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {(["recent", "created", "name", "size"] as SortKey[]).map((s) => (
              <SelectItem key={s} value={s}>
                {tSort(s)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {undoable.length > 0 ? (
          <Button size="sm" variant="secondary" onClick={() => void undoDelete()}>
            {t("undoDelete", { count: undoable.length })}
          </Button>
        ) : null}
      </div>

      {duplicates.length > 0 ? (
        <p className="border-b border-border-subtle bg-surface-subtle px-3 py-1.5 text-xs text-text-muted">
          {t("duplicatesFound", { groups: duplicates.length })}
        </p>
      ) : null}

      <div className="flex min-h-0 flex-1">
        <div className="min-w-0 flex-1">
          {view.length === 0 ? (
            <div className="flex h-full items-center justify-center p-8">
              <EmptyState
                title={files.length === 0 ? t("emptyTitle") : t("noMatchesTitle")}
                description={files.length === 0 ? t("emptyBody") : t("noMatchesBody")}
                icon={FolderOpen}
              />
            </div>
          ) : (
            <FileGrid
              files={view}
              selected={selected}
              focusedId={focusedId}
              onSelect={(id, mods) => {
                setFocusedId(id);
                select(id, mods);
              }}
              onActivate={activate}
              onContextMenu={(id, at) => setMenu({ id, ...at })}
              onDropOnFile={(ids, targetId) => void onDropOnFile(ids, targetId)}
            />
          )}
        </div>

        <Inspector
          file={activeFile}
          selectionCount={selected.size}
          tags={tags}
          collections={collections}
          events={events}
          recommendations={recommendations.map((r) => ({
            toolId: r.entry.toolId,
            href: r.entry.href,
            label: r.entry.toolId,
          }))}
          onOpenWith={(href) => {
            if (activeId) void openWith(href, activeId);
          }}
          onSelectFile={(id) => {
            setFocusedId(id);
            select(id, {});
          }}
          onDelete={() => void removeSelected()}
        />
      </div>

      {menu ? (
        <DropdownMenu open onOpenChange={(open) => !open && setMenu(null)}>
          <DropdownMenuContent
            style={{ position: "fixed", left: menu.x, top: menu.y }}
            onEscapeKeyDown={() => setMenu(null)}
          >
            <DropdownMenuItem onSelect={() => activate(menu.id)}>{t("open")}</DropdownMenuItem>
            <DropdownMenuItem onSelect={() => setPreviewId(menu.id)}>{t("quickLook")}</DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onSelect={() => {
                const file = files.find((f) => f.id === menu.id);
                if (file) void workspace.setPinned(file.id, !file.pinned);
              }}
            >
              {files.find((f) => f.id === menu.id)?.pinned ? t("unpin") : t("pin")}
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={() => void removeSelected()}>{t("delete")}</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      ) : null}

      {previewId ? (
        <QuickPreview
          fileId={previewId}
          onClose={() => setPreviewId(null)}
          onOpen={() => {
            const id = previewId;
            setPreviewId(null);
            activate(id);
          }}
        />
      ) : null}
    </div>
  );
}

export { kindOf };
