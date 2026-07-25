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
  type SavedSearch,
  type SortKey,
  type WorkspaceFile,
} from "@omnio/workspace";
import { useSelection, useWorkspace } from "@omnio/workspace/react";
import {
  Button,
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  EmptyState,
  Input,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@omnio/ui";
import { Bookmark, FolderOpen, LayoutGrid, List, Search, SlidersHorizontal } from "lucide-react";
import { useRouter } from "@/i18n/navigation";
import { mimeMatches, normalizeMime } from "@/lib/file-intel";
import { SEARCH_ENTRIES } from "@/generated/registry.search";
import { FileGrid, type ThumbSize, type ViewMode } from "./file-grid";
import { FileContextMenu } from "./file-context-menu";
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
  const tSize = useTranslations("files.size");
  const router = useRouter();
  const { files, tags, collections, events, searches, ready, supported } = useWorkspace();

  const [text, setText] = useState("");
  const [sort, setSort] = useState<SortKey>("recent");
  const [kind, setKind] = useState<string>("");
  const [collectionId, setCollectionId] = useState<string>("");
  const [tagIds, setTagIds] = useState<string[]>([]);
  const [view, setView] = useState<ViewMode>("grid");
  const [size, setSize] = useState<ThumbSize>("m");
  const [savingSearch, setSavingSearch] = useState(false);
  const [searchName, setSearchName] = useState("");
  const [focusedId, setFocusedId] = useState<string | null>(null);
  const [renameId, setRenameId] = useState<string | null>(null);
  const [previewId, setPreviewId] = useState<string | null>(null);
  const [undoable, setUndoable] = useState<Array<{ file: WorkspaceFile; blob: File }>>([]);
  const containerRef = useRef<HTMLDivElement>(null);

  // View preferences are UI state, not workspace data, so they live in
  // localStorage rather than IndexedDB and never sync anywhere.
  useEffect(() => {
    try {
      const raw = localStorage.getItem("omnio.files.view");
      if (raw) {
        const saved = JSON.parse(raw) as { view?: ViewMode; size?: ThumbSize };
        if (saved.view) setView(saved.view);
        if (saved.size) setSize(saved.size);
      }
    } catch {
      // A corrupt preference must never keep the workspace from opening.
    }
  }, []);
  useEffect(() => {
    try {
      localStorage.setItem("omnio.files.view", JSON.stringify({ view, size }));
    } catch {
      // Storage full or blocked; the preference simply does not persist.
    }
  }, [view, size]);

  const query = useMemo(
    () => ({
      text,
      kind: kind || undefined,
      collectionId: collectionId || undefined,
      tagIds: tagIds.length > 0 ? tagIds : undefined,
    }),
    [text, kind, collectionId, tagIds],
  );

  const visible = useMemo(() => sortFiles(searchFiles(files, query), sort), [files, query, sort]);

  const { selected, select, selectAll, clear } = useSelection(visible);
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

  const duplicateSelection = useCallback(
    async (fallbackId: string) => {
      const ids = selected.has(fallbackId) ? [...selected] : [fallbackId];
      for (const id of ids) await workspace.duplicate(id);
    },
    [selected],
  );

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

      const index = focusedId ? visible.findIndex((f) => f.id === focusedId) : -1;
      const move = (delta: number) => {
        e.preventDefault();
        const next = visible[Math.max(0, Math.min(visible.length - 1, (index < 0 ? 0 : index) + delta))];
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
  }, [visible, focusedId, activeId, selected, previewId, undoable, select, selectAll, clear, activate, removeSelected, undoDelete]);

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
  const activeFilters = tagIds.length + (collectionId ? 1 : 0) + (kind ? 1 : 0);
  const hasQuery = activeFilters > 0 || text.trim() !== "";

  const clearFilters = useCallback(() => {
    setTagIds([]);
    setCollectionId("");
    setKind("");
  }, []);

  const applySearch = useCallback((saved: SavedSearch) => {
    setText(saved.query.text ?? "");
    setKind(saved.query.kind ?? "");
    setCollectionId(saved.query.collectionId ?? "");
    setTagIds(saved.query.tagIds ?? []);
  }, []);

  const commitSavedSearch = useCallback(async () => {
    if (searchName.trim() === "") return;
    await workspace.saveSearch(searchName, query);
    setSearchName("");
    setSavingSearch(false);
  }, [searchName, query]);

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
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button size="sm" variant={activeFilters > 0 ? "primary" : "secondary"}>
              <SlidersHorizontal className="me-1 h-3.5 w-3.5" />
              {activeFilters > 0 ? t("filtersActive", { count: activeFilters }) : t("filters")}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel>{t("tags")}</DropdownMenuLabel>
            {tags.length === 0 ? (
              <DropdownMenuItem disabled>{t("noTags")}</DropdownMenuItem>
            ) : (
              tags.map((tag) => (
                <DropdownMenuCheckboxItem
                  key={tag.id}
                  checked={tagIds.includes(tag.id)}
                  onCheckedChange={(on) =>
                    setTagIds((current) =>
                      on ? [...current, tag.id] : current.filter((id) => id !== tag.id),
                    )
                  }
                >
                  {tag.name}
                </DropdownMenuCheckboxItem>
              ))
            )}
            {collections.length > 0 ? (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuLabel>{t("collections")}</DropdownMenuLabel>
                {collections.map((collection) => (
                  <DropdownMenuCheckboxItem
                    key={collection.id}
                    checked={collectionId === collection.id}
                    onCheckedChange={(on) => setCollectionId(on ? collection.id : "")}
                  >
                    {collection.name}
                  </DropdownMenuCheckboxItem>
                ))}
              </>
            ) : null}
            {activeFilters > 0 ? (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuItem onSelect={clearFilters}>{t("clearFilters")}</DropdownMenuItem>
              </>
            ) : null}
          </DropdownMenuContent>
        </DropdownMenu>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button size="sm" variant="secondary" aria-label={t("savedSearches")}>
              <Bookmark className="h-3.5 w-3.5" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel>{t("savedSearches")}</DropdownMenuLabel>
            {searches.length === 0 ? (
              <DropdownMenuItem disabled>{t("noSavedSearches")}</DropdownMenuItem>
            ) : (
              searches.map((saved) => (
                <DropdownMenuItem key={saved.id} onSelect={() => applySearch(saved)}>
                  {saved.name}
                </DropdownMenuItem>
              ))
            )}
            {hasQuery ? (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuItem onSelect={() => setSavingSearch(true)}>
                  {t("saveSearch")}
                </DropdownMenuItem>
              </>
            ) : null}
          </DropdownMenuContent>
        </DropdownMenu>

        <div className="flex items-center gap-0.5 rounded-md border border-border p-0.5" role="group" aria-label={t("viewMode")}>
          <Button
            size="sm"
            variant={view === "grid" ? "primary" : "ghost"}
            aria-pressed={view === "grid"}
            aria-label={t("gridView")}
            onClick={() => setView("grid")}
          >
            <LayoutGrid className="h-3.5 w-3.5" />
          </Button>
          <Button
            size="sm"
            variant={view === "list" ? "primary" : "ghost"}
            aria-pressed={view === "list"}
            aria-label={t("listView")}
            onClick={() => setView("list")}
          >
            <List className="h-3.5 w-3.5" />
          </Button>
        </div>

        {view === "grid" ? (
          <div className="flex items-center gap-0.5" role="group" aria-label={t("thumbSize")}>
            {(["s", "m", "l"] as ThumbSize[]).map((option) => (
              <Button
                key={option}
                size="sm"
                variant={size === option ? "primary" : "ghost"}
                aria-pressed={size === option}
                aria-label={tSize(option)}
                onClick={() => setSize(option)}
              >
                {option.toUpperCase()}
              </Button>
            ))}
          </div>
        ) : null}

        {undoable.length > 0 ? (
          <Button size="sm" variant="secondary" onClick={() => void undoDelete()}>
            {t("undoDelete", { count: undoable.length })}
          </Button>
        ) : null}
      </div>

      {savingSearch ? (
        <div className="flex items-center gap-2 border-b border-border-subtle px-3 py-2">
          <Input
            autoFocus
            value={searchName}
            onChange={(e) => setSearchName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") void commitSavedSearch();
              if (e.key === "Escape") setSavingSearch(false);
            }}
            placeholder={t("saveSearchPlaceholder")}
            aria-label={t("saveSearchPlaceholder")}
            className="h-8 max-w-64"
          />
          <Button size="sm" onClick={() => void commitSavedSearch()} disabled={searchName.trim() === ""}>
            {t("save")}
          </Button>
        </div>
      ) : null}

      {duplicates.length > 0 ? (
        <p className="border-b border-border-subtle bg-surface-subtle px-3 py-1.5 text-xs text-text-muted">
          {t("duplicatesFound", { groups: duplicates.length })}
        </p>
      ) : null}

      <div className="flex min-h-0 flex-1">
        <div className="min-w-0 flex-1">
          {visible.length === 0 ? (
            <div className="flex h-full items-center justify-center p-8">
              <EmptyState
                title={files.length === 0 ? t("emptyTitle") : t("noMatchesTitle")}
                description={files.length === 0 ? t("emptyBody") : t("noMatchesBody")}
                icon={FolderOpen}
              />
            </div>
          ) : (
            <FileGrid
              files={visible}
              view={view}
              size={size}
              selected={selected}
              focusedId={focusedId}
              onSelect={(id, mods) => {
                setFocusedId(id);
                select(id, mods);
              }}
              onActivate={activate}
              onContextMenu={(id) => {
                if (!selected.has(id)) select(id, {});
              }}
              renderContextMenu={(file) => (
                <FileContextMenu
                  file={file}
                  selectionCount={selected.has(file.id) ? selected.size : 1}
                  tags={tags}
                  collections={collections}
                  recommendations={recommendationsFor(file).map((r) => ({
                    toolId: r.entry.toolId,
                    href: r.entry.href,
                    label: r.entry.toolId,
                  }))}
                  onOpen={() => activate(file.id)}
                  onOpenWith={(href) => void openWith(href, file.id)}
                  onQuickLook={() => setPreviewId(file.id)}
                  onRename={() => setRenameId(file.id)}
                  onDuplicate={() => void duplicateSelection(file.id)}
                  onDelete={() => void removeSelected()}
                />
              )}
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
          renameRequestId={renameId}
          onRenameHandled={() => setRenameId(null)}
        />
      </div>

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
