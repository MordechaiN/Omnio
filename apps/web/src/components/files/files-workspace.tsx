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
import { Bookmark, FolderOpen, LayoutGrid, List, Search, SlidersHorizontal, Trash2 } from "lucide-react";
import { useRouter } from "@/i18n/navigation";
import { mimeMatches, normalizeMime } from "@/lib/file-intel";
import { SEARCH_ENTRIES } from "@/generated/registry.search";
import { FileGrid, type ThumbSize, type ViewMode } from "./file-grid";
import { FileContextMenu } from "./file-context-menu";
import { installPdfThumbnailer } from "@/lib/pdf-thumbnail";
import { ChainSuggestions } from "./chain-suggestions";
import { FileInsights } from "./file-insights";
import { GroupActions } from "./group-actions";
import { FileStaleness } from "./file-staleness";
import { FileRecognition } from "./file-recognition";
import { rememberHandoff } from "@/lib/provenance";
import { Inspector } from "./inspector";
import { QuickPreview } from "./quick-preview";

/** Size steps drawn as proportional squares, the way a desktop zoom control is. */
const SIZE_OPTIONS: Array<{ value: ThumbSize; dot: number }> = [
  { value: "s", dot: 7 },
  { value: "m", dot: 10 },
  { value: "l", dot: 13 },
];

/**
 * Tools that accept this file, best match first.
 *
 * Tools that only make sense on several files at once are demoted when a single
 * file is selected. Leading with "Merge PDFs" for one document — a tool that
 * cannot do anything until a second file arrives — is a worse first impression
 * than showing nothing.
 */
function recommendationsFor(file: WorkspaceFile | null, selectionSize = 1) {
  if (!file) return [];
  const mime = normalizeMime(file.mime, file.name);
  return SEARCH_ENTRIES.flatMap((entry) => {
    const accept = entry.accepts.find((a) => a.mime.some((p) => mimeMatches(p, mime)));
    if (!accept) return [];
    const needsMany = accept.multiple === true && selectionSize < 2;
    return [{ entry, priority: (accept.priority ?? 50) - (needsMany ? 100 : 0) }];
  })
    .sort((a, b) => b.priority - a.priority)
    .slice(0, 6);
}

export function FilesWorkspace() {
  const t = useTranslations("files");
  const tRoot = useTranslations();
  const tKind = useTranslations("files.kind");
  const tSort = useTranslations("files.sort");
  const tSize = useTranslations("files.size");
  const router = useRouter();
  const { files, tags, collections, events, searches, chains, ready, supported } = useWorkspace();

  // Teach the workspace to render PDF pages. Registered from the app so the
  // storage layer never depends on a rendering engine.
  useEffect(() => installPdfThumbnailer(), []);

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
  const recommendations = useMemo(
    () => recommendationsFor(activeFile, selected.size),
    [activeFile, selected.size],
  );

  /**
   * Tool entries carry an i18n namespace and name key; the internal id is not a
   * user-facing string and must never reach the screen.
   */
  const labelFor = useCallback(
    (entry: { i18nNamespace: string; nameKey: string; toolId: string }) =>
      tRoot(`${entry.i18nNamespace}.${entry.nameKey}` as Parameters<typeof tRoot>[0]),
    [tRoot],
  );

  const openWith = useCallback(
    async (href: string, fileId: string, toolId?: string, replaces?: WorkspaceFile) => {
      const handle = await workspace.openFile(fileId, toolId);
      if (!handle) return;
      // Remember where this came from so the tool's output can be linked back —
      // and, when this run is rebuilding something stale, which file it retires.
      if (toolId) {
        rememberHandoff(
          fileId,
          toolId,
          replaces ? { fileId: replaces.id, name: replaces.name } : undefined,
        );
      }
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

  /**
   * First run: no files have ever been here.
   *
   * The full screen — search, type filter, sort, saved searches, two view
   * toggles, three size steps and an inspector reading "nothing selected" —
   * is a dozen controls arranged around nothing, which reads as complicated
   * rather than capable. Worse, none of them could add a file: dragging was
   * the only way in, so anyone not thinking to drag was simply stuck.
   *
   * A filtered-to-empty list is a different situation and keeps its toolbar,
   * because there the controls are what gets you out of it.
   *
   * A pending undo also keeps the normal screen. Deleting your only file empties
   * the workspace, and taking this path would have removed the "undo delete"
   * offer along with the toolbar — losing the file for good at the exact moment
   * someone needs it back.
   */
  if (ready && files.length === 0 && undoable.length === 0) {
    return (
      <div className="flex h-[calc(100vh-8rem)] items-center justify-center p-8">
        <EmptyState
          title={t("emptyTitle")}
          description={t("emptyBody")}
          icon={FolderOpen}
          action={
            <Button
              onClick={() => {
                const input = document.createElement("input");
                input.type = "file";
                input.multiple = true;
                input.onchange = () => {
                  const chosen = [...(input.files ?? [])];
                  if (chosen.length > 0) {
                    window.dispatchEvent(
                      new CustomEvent("omnio:inspect", { detail: { files: chosen, record: true } }),
                    );
                  }
                };
                input.click();
              }}
            >
              {t("emptyChoose")}
            </Button>
          }
        />
      </div>
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
          <SelectTrigger className="w-44" aria-label={t("sortBy")}>
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
              // Deletable, because they were not: saved searches could only ever
              // accumulate, and `removeSearch` had no caller in the product.
              searches.map((saved) => (
                <DropdownMenuItem
                  key={saved.id}
                  onSelect={() => applySearch(saved)}
                  className="group justify-between gap-2"
                >
                  <span className="truncate">{saved.name}</span>
                  <button
                    type="button"
                    aria-label={t("forgetSearch", { name: saved.name })}
                    className="shrink-0 rounded p-0.5 text-text-muted opacity-0 transition-opacity hover:text-text focus-visible:opacity-100 group-hover:opacity-100"
                    onClick={(event) => {
                      // Keep the menu open: removing one is rarely the only edit.
                      event.stopPropagation();
                      event.preventDefault();
                      void workspace.removeSearch(saved.id);
                    }}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
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
          <div
            className="flex items-center gap-0.5 rounded-md border border-border p-0.5"
            role="group"
            aria-label={t("thumbSize")}
          >
            {SIZE_OPTIONS.map(({ value, dot }) => (
              <Button
                key={value}
                size="sm"
                variant={size === value ? "primary" : "ghost"}
                aria-pressed={size === value}
                aria-label={tSize(value)}
                title={tSize(value)}
                onClick={() => setSize(value)}
              >
                <span
                  className="block rounded-[2px] bg-current"
                  style={{ width: dot, height: dot }}
                  aria-hidden
                />
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
                    label: labelFor(r.entry),
                  }))}
                  onOpen={() => activate(file.id)}
                  onOpenWith={(href, toolId) => void openWith(href, file.id, toolId)}
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
            label: labelFor(r.entry),
          }))}
          onOpenWith={(href, toolId) => {
            if (activeId) void openWith(href, activeId, toolId);
          }}
          onSelectFile={(id) => {
            setFocusedId(id);
            select(id, {});
          }}
          onDelete={() => void removeSelected()}
          insightSlot={
            activeFile ? (
              <>
                {/* Recognition leads: a finished file is worth more than an
                    observation about the one in hand. */}
                <FileRecognition
                  file={activeFile}
                  files={files}
                  events={events}
                  onOpenResult={(id) => {
                    setFocusedId(id);
                    select(id, {});
                  }}
                />
              {/* Leads the panel: knowing the file is out of date changes whether
                  you want to do anything else with it at all. */}
              <FileStaleness
                file={activeFile}
                files={files}
                onRedo={(href, toolId, fileId, replaces) =>
                  void openWith(href, fileId, toolId, replaces)
                }
              />
              <FileInsights
                file={activeFile}
                files={files}
                onOpenWith={(href, toolId) => void openWith(href, activeFile.id, toolId)}
                />
              </>
            ) : null
          }
          groupSlot={
            selected.size > 1 ? (
              <GroupActions
                files={[...selected]
                  .map((id) => files.find((f) => f.id === id))
                  .filter((f): f is WorkspaceFile => Boolean(f))}
                onOpened={clear}
              />
            ) : null
          }
          chainSlot={
            activeFile ? (
              <ChainSuggestions
                file={activeFile}
                files={files}
                chains={chains}
                onStarted={(toolId, fileId) => {
                  const entry = SEARCH_ENTRIES.find((e) => e.toolId === toolId);
                  if (entry) void openWith(entry.href, fileId, toolId);
                }}
              />
            ) : null
          }
          renameRequestId={renameId}
          onRenameHandled={() => setRenameId(null)}
        />
      </div>

      {previewId ? (
        <QuickPreview
          fileId={previewId}
          file={files.find((f) => f.id === previewId) ?? null}
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
