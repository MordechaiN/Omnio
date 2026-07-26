"use client";

import { useCallback, useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { setPendingFiles } from "@omnio/module-sdk";
import { hashBytes, recognizeByHash, workspace, type Recognition } from "@omnio/workspace";
import { takeHandoff } from "@/lib/provenance";
import {
  Badge,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  Spinner,
} from "@omnio/ui";
import { DynamicIcon, type IconName } from "lucide-react/dynamic";
import { ChevronRight, FileQuestion, Files, RotateCcw, Sparkles } from "lucide-react";
import { useRouter } from "@/i18n/navigation";
import {
  classifyKind,
  inspectFile,
  mimeMatches,
  normalizeMime,
  smartActions,
  type FileIntel,
  type FileKind,
} from "@/lib/file-intel";
import { SEARCH_ENTRIES, type SearchEntry } from "@/generated/registry.search";
import { recordSessionFile } from "@/lib/session-workspace";

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.round(seconds - m * 60);
  return `${m}:${String(s).padStart(2, "0")}`;
}

interface MultiIntel {
  files: File[];
  totalSize: number;
  kinds: Map<FileKind, number>;
  largest: File;
  smallest: File;
}

function buildMulti(files: File[]): MultiIntel {
  const kinds = new Map<FileKind, number>();
  let largest = files[0]!;
  let smallest = files[0]!;
  let totalSize = 0;
  for (const file of files) {
    const kind = classifyKind(normalizeMime(file.type, file.name), "");
    kinds.set(kind, (kinds.get(kind) ?? 0) + 1);
    totalSize += file.size;
    if (file.size > largest.size) largest = file;
    if (file.size < smallest.size) smallest = file;
  }
  return { files, totalSize, kinds, largest, smallest };
}

/** True when two or more files share a base name (case-insensitive, extension ignored). */
function hasDuplicateNames(files: File[]): boolean {
  const seen = new Set<string>();
  for (const file of files) {
    const base = file.name.replace(/\.[^.]+$/, "").toLowerCase();
    if (seen.has(base)) return true;
    seen.add(base);
  }
  return false;
}

/** Tools whose accepts declare multiple and cover every file in the set. */
function multiActions(
  files: File[],
): Array<{ entry: SearchEntry; score: number; reasonKey?: string }> {
  const mimes = files.map((file) => normalizeMime(file.type, file.name));
  const duplicateNames = hasDuplicateNames(files);
  const actions: Array<{ entry: SearchEntry; score: number; reasonKey?: string }> = [];
  for (const entry of SEARCH_ENTRIES) {
    if (entry.tier !== "browser") continue;
    const matched = entry.accepts.find(
      (accept) =>
        accept.multiple === true &&
        mimes.every((mime) => accept.mime.some((pattern) => mimeMatches(pattern, mime))),
    );
    if (!matched) continue;
    let score = matched.priority ?? 50;
    let reasonKey: string | undefined;
    // Duplicate filenames are the one proactive nudge at the multi-file
    // level — everything else lives in lib/file-intel's per-file rules.
    if (duplicateNames && entry.toolId === "bulk-rename") {
      score += 40;
      reasonKey = "duplicateNames";
    }
    actions.push({ entry, score, reasonKey });
  }
  return actions.sort((a, b) => b.score - a.score);
}

/**
 * 🪄 Omnio's signature move: drop (or paste) anything, anywhere. One file gets
 * the full inspection; several files get a project-style summary and the
 * batch-capable actions. Every file that passes through is remembered in the
 * session workspace (memory only). Modules chime in via events:
 * `omnio:inspect` re-opens files, `omnio:session-file` records an output.
 */
export function FileIntelligence() {
  const t = useTranslations();
  const router = useRouter();
  const [dragging, setDragging] = useState(false);
  const [intel, setIntel] = useState<FileIntel | null>(null);
  const [multi, setMulti] = useState<MultiIntel | null>(null);
  const [inspecting, setInspecting] = useState(false);
  /** Work already done on these exact bytes, known before anything is imported. */
  const [known, setKnown] = useState<Recognition | null>(null);

  const openFiles = useCallback(async (incoming: File[], record: boolean) => {
    if (incoming.length === 0) return;
    setKnown(null);

    // Before offering a single thing to do, check whether it has been done.
    // The hash of the incoming bytes is enough — the file does not need to be
    // imported first — so the finished work can lead instead of a tool list.
    if (incoming.length === 1) {
      void (async () => {
        try {
          const hash = await hashBytes(await incoming[0]!.arrayBuffer());
          const snapshot = workspace.getSnapshot();
          setKnown(recognizeByHash(hash, snapshot.files, snapshot.events));
        } catch {
          // Recognition is a bonus; failing to compute it must change nothing.
        }
      })();
    }
    if (record) for (const file of incoming) recordSessionFile(file, "dropped");
    // Keep a durable copy in the file workspace. Deliberately not awaited: the
    // inspection below must appear instantly, and hashing a large file would
    // otherwise hold it up. A failure here (no OPFS, private mode) must never
    // stop a drop from working, so it is swallowed.
    if (record) {
      for (const file of incoming) {
        void workspace.import(file).catch(() => undefined);
      }
    }
    if (incoming.length === 1) {
      setInspecting(true);
      try {
        const next = await inspectFile(incoming[0]!);
        setMulti(null);
        setIntel((previous) => {
          if (previous?.previewUrl) URL.revokeObjectURL(previous.previewUrl);
          return next;
        });
      } finally {
        setInspecting(false);
      }
    } else {
      setIntel(null);
      setMulti(buildMulti(incoming));
    }
  }, []);

  useEffect(() => {
    let depth = 0;
    const hasFiles = (event: DragEvent) =>
      [...(event.dataTransfer?.types ?? [])].includes("Files");

    const onDragEnter = (event: DragEvent) => {
      if (!hasFiles(event)) return;
      depth += 1;
      setDragging(true);
    };
    const onDragLeave = (event: DragEvent) => {
      if (!hasFiles(event)) return;
      depth = Math.max(0, depth - 1);
      if (depth === 0) setDragging(false);
    };
    const onDragOver = (event: DragEvent) => {
      if (hasFiles(event)) event.preventDefault();
    };
    const onDrop = (event: DragEvent) => {
      if (!hasFiles(event)) return;
      event.preventDefault();
      depth = 0;
      setDragging(false);
      const dropped = [...(event.dataTransfer?.files ?? [])];
      void openFiles(dropped, true);
    };
    const onPaste = (event: ClipboardEvent) => {
      const pasted = [...(event.clipboardData?.items ?? [])]
        .filter((item) => item.kind === "file")
        .map((item) => item.getAsFile())
        .filter((file): file is File => file !== null);
      if (pasted.length > 0) {
        event.preventDefault();
        void openFiles(pasted, true);
      }
    };
    // Session workspace hooks: strip rows re-open files (already recorded);
    // the home hero passes { record: true } so chosen files enter the session.
    const onInspect = (event: Event) => {
      const detail = (event as CustomEvent<File[] | { files: File[]; record?: boolean }>).detail;
      if (Array.isArray(detail)) {
        void openFiles(detail, false);
      } else if (detail && Array.isArray(detail.files)) {
        void openFiles(detail.files, detail.record ?? false);
      }
    };
    const onSessionFile = (event: Event) => {
      const detail = (event as CustomEvent<File>).detail;
      if (detail instanceof File) recordSessionFile(detail, "output");
    };
    // A tool produced a file. Keep it in the workspace so its output can feed
    // the next tool directly. Modules stay free of a workspace dependency by
    // announcing this rather than importing the store themselves.
    const onProduce = (event: Event) => {
      const detail = (event as CustomEvent<{ blob: Blob; name: string; mime: string }>).detail;
      if (!detail?.blob) return;
      // Link the output to the file it was made from, when we know it. This is
      // what lets Omnio learn a sequence from ordinary use rather than only
      // inside an explicit chain run.
      const handoff = takeHandoff();
      void (async () => {
        const produced = await workspace.import(
          new File([detail.blob], detail.name, { type: detail.mime }),
          handoff ? { fromFileId: handoff.fileId, toolId: handoff.toolId } : undefined,
        );
        // This run was rebuilding something that had gone stale. Finish the job:
        // the replacement takes the old name, and the file it supersedes is
        // archived. Leaving both, identically named and differently aged, would
        // recreate by hand the exact confusion the discovery set out to remove.
        if (handoff?.replaces) {
          await workspace.rename(produced.id, handoff.replaces.name);
          await workspace.archive([handoff.replaces.fileId]);
        }
      })().catch(() => undefined);
    };

    window.addEventListener("dragenter", onDragEnter);
    window.addEventListener("dragleave", onDragLeave);
    window.addEventListener("dragover", onDragOver);
    window.addEventListener("drop", onDrop);
    window.addEventListener("paste", onPaste);
    window.addEventListener("omnio:inspect", onInspect);
    window.addEventListener("omnio:session-file", onSessionFile);
    window.addEventListener("omnio:workspace-produce", onProduce);
    return () => {
      window.removeEventListener("dragenter", onDragEnter);
      window.removeEventListener("dragleave", onDragLeave);
      window.removeEventListener("dragover", onDragOver);
      window.removeEventListener("drop", onDrop);
      window.removeEventListener("paste", onPaste);
      window.removeEventListener("omnio:inspect", onInspect);
      window.removeEventListener("omnio:session-file", onSessionFile);
      window.removeEventListener("omnio:workspace-produce", onProduce);
    };
  }, [openFiles]);

  /**
   * Five, not eight.
   *
   * This dialog is the first screen anyone sees after their first action, and it
   * was eight rows of identical icons with no ordering anyone could perceive —
   * a list to read rather than a choice to make. Worse, a dropped PDF offered
   * *Organize Pages* alongside *Rotate*, *Delete* and *Reorder Pages*, which are
   * three things Organize already does; four of the eight were one job. Those
   * three are now ranked below the tools that do something genuinely different,
   * so what remains is five distinct outcomes. Nothing was removed from Omnio —
   * every tool is still one search away.
   */
  /**
   * The dropped PDF's first page, rendered after the dialog is already up.
   *
   * Deliberately not part of `inspectFile`: the panel opens in about 90ms and
   * waiting on pdf.js to show it would trade a fast, honest response for a
   * prettier one. The page appears a moment later, in place of the icon.
   */
  const [pdfPreview, setPdfPreview] = useState<string | null>(null);
  /** True once we know this PDF carries no selectable text — i.e. it is a scan. */
  const [pdfScanned, setPdfScanned] = useState(false);
  useEffect(() => {
    setPdfPreview(null);
    setPdfScanned(false);
    if (intel?.kind !== "pdf") return undefined;
    let url: string | null = null;
    let cancelled = false;
    void (async () => {
      const { renderPdfFirstPage } = await import("@/lib/pdf-thumbnail");
      const rendered = await renderPdfFirstPage(intel.file);
      if (!rendered || cancelled) return;
      url = URL.createObjectURL(rendered.blob);
      setPdfPreview(url);
      setPdfScanned(!rendered.hasText);
    })();
    return () => {
      cancelled = true;
      if (url) URL.revokeObjectURL(url);
    };
  }, [intel]);

  const singleActions = intel
    ? smartActions({
        ...intel,
        name: intel.file.name,
        understanding: pdfScanned
          ? { kind: "pdf", pages: intel.facts.pageCount ?? 1, hasText: false }
          : intel.understanding,
      }).slice(0, 5)
    : [];
  const groupActions = multi ? multiActions(multi.files) : [];

  function launch(href: string, payload: File[]) {
    setPendingFiles(payload);
    close();
    router.push(href);
  }

  function close() {
    if (intel?.previewUrl) URL.revokeObjectURL(intel.previewUrl);
    setIntel(null);
    setMulti(null);
  }

  const facts: string[] = [];
  if (intel) {
    facts.push(formatBytes(intel.size));
    if (intel.facts.width && intel.facts.height) facts.push(`${intel.facts.width}×${intel.facts.height}`);
    if (intel.facts.pageCount !== undefined) facts.push(t("dropzone.pages", { count: intel.facts.pageCount }));
    if (intel.facts.entries) facts.push(t("dropzone.files", { count: intel.facts.entries.length }));
    if (intel.facts.duration !== undefined) facts.push(formatDuration(intel.facts.duration));
    if (intel.facts.jsonValid === false) facts.push(t("dropzone.invalidJson"));
    if (intel.facts.hasExif) facts.push(t("dropzone.hasExif"));
  }

  const open = intel !== null || multi !== null;

  return (
    <>
      {dragging ? (
        <div
          aria-hidden="true"
          className="pointer-events-none fixed inset-0 z-(--z-modal) flex items-center justify-center bg-backdrop backdrop-blur-(--blur-backdrop)"
        >
          <div className="flex flex-col items-center gap-3 rounded-2xl border-2 border-dashed border-accent bg-surface px-12 py-10 shadow-2">
            <Sparkles size={28} className="text-accent" aria-hidden="true" />
            <p className="text-lg font-semibold">{t("dropzone.veilTitle")}</p>
            <p className="text-sm text-text-muted">{t("dropzone.veilBody")}</p>
          </div>
        </div>
      ) : null}

      {inspecting ? (
        <div className="fixed bottom-6 end-6 z-(--z-modal) flex items-center gap-2 rounded-full border border-border-subtle bg-surface px-4 py-2 shadow-2">
          <Spinner size={16} />
          <span className="text-sm">{t("dropzone.inspecting")}</span>
        </div>
      ) : null}

      <Dialog open={open} onOpenChange={(next) => !next && close()}>
        <DialogContent className="max-w-lg">
          {intel ? (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <Sparkles size={16} className="text-accent" aria-hidden="true" />
                  {t("dropzone.dialogTitle")}
                </DialogTitle>
              </DialogHeader>

              <div className="flex items-start gap-4">
                <div className="flex size-20 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-border-subtle bg-surface-raised">
                  {intel.kind === "image" && intel.previewUrl ? (
                    <img src={intel.previewUrl} alt="" className="size-full object-cover" />
                  ) : pdfPreview ? (
                    <img src={pdfPreview} alt="" className="size-full object-contain" />
                  ) : (
                    <FileQuestion size={28} className="text-text-muted" aria-hidden="true" />
                  )}
                </div>
                <div className="flex min-w-0 flex-col gap-1.5">
                  <p dir="ltr" className="truncate text-start text-sm font-medium">
                    {intel.file.name}
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {facts.map((fact) => (
                      <Badge key={fact} variant="neutral">
                        <span dir="ltr">{fact}</span>
                      </Badge>
                    ))}
                  </div>
                  {intel.kind === "audio" && intel.previewUrl ? (
                    <audio controls src={intel.previewUrl} className="mt-1 h-8 w-56 max-w-full" />
                  ) : null}
                </div>
              </div>

              {/* If this work already exists, it outranks everything below —
                  the useful move is handing it back, not offering to redo it. */}
              {known && known.results.length > 0 ? (
                <div className="flex flex-col gap-2 rounded-xl border border-accent/40 bg-accent/5 p-3">
                  <p className="flex items-start gap-2 text-start text-sm">
                    <RotateCcw size={15} className="mt-0.5 shrink-0 text-accent" aria-hidden="true" />
                    <span>
                      <span className="block font-medium">{t("dropzone.seenBefore")}</span>
                      <span className="block text-xs text-text-muted">
                        {t("dropzone.seenBeforeReason")}
                      </span>
                    </span>
                  </p>
                  <div className="flex flex-col gap-1.5">
                    {known.results.slice(0, 2).map((result) => {
                      const toolEntry = SEARCH_ENTRIES.find((e) => e.toolId === result.toolId);
                      const toolName = toolEntry
                        ? t(`${toolEntry.i18nNamespace}.${toolEntry.nameKey}` as Parameters<typeof t>[0])
                        : result.toolId;
                      return (
                        <button
                          key={result.file.id}
                          type="button"
                          onClick={() => {
                            void (async () => {
                              const handle = await workspace.openFile(result.file.id);
                              if (handle) {
                                const url = URL.createObjectURL(handle);
                                const anchor = document.createElement("a");
                                anchor.href = url;
                                anchor.download = handle.name;
                                anchor.click();
                                URL.revokeObjectURL(url);
                              }
                              setIntel(null);
                            })();
                          }}
                          className="flex items-center gap-2 rounded-lg border border-border-subtle bg-surface px-3 py-2 text-start text-sm transition-colors hover:bg-surface-raised"
                        >
                          <span className="min-w-0 flex-1 truncate">
                            {t("dropzone.seenBeforeGet", { tool: toolName })}
                          </span>
                          <span dir="ltr" className="shrink-0 truncate text-xs text-text-muted">
                            {result.file.name}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              ) : null}

              {intel.facts.textPreview ? (
                <pre
                  dir="ltr"
                  className="max-h-28 overflow-hidden rounded-lg border border-border-subtle bg-surface-raised p-3 text-start font-mono text-xs text-text-secondary"
                >
                  {intel.facts.textPreview}
                </pre>
              ) : null}
              {intel.facts.entries && intel.facts.entries.length > 0 ? (
                <ul
                  dir="ltr"
                  className="max-h-28 overflow-hidden rounded-lg border border-border-subtle bg-surface-raised p-3 text-start font-mono text-xs text-text-secondary"
                >
                  {intel.facts.entries.map((name) => (
                    <li key={name} className="truncate">
                      {name}
                    </li>
                  ))}
                </ul>
              ) : null}

              {singleActions.length > 0 ? (
                <div className="flex flex-col gap-1.5" role="list" aria-label={t("dropzone.actionsTitle")}>
                  {singleActions.map(({ entry, reasonKey }) => {
                    const name = t(`${entry.i18nNamespace}.${entry.nameKey}` as Parameters<typeof t>[0]);
                    return (
                      <button
                        key={entry.id}
                        type="button"
                        role="listitem"
                        onClick={() => launch(entry.href, [intel.file])}
                        className="group flex items-center gap-3 rounded-lg border border-border-subtle bg-surface px-3 py-2.5 text-start transition-[border-color,background-color] duration-(--motion-fast) ease-(--ease-out) hover:border-border hover:bg-surface-raised"
                      >
                        <span className="flex size-8 shrink-0 items-center justify-center rounded-md bg-accent-subtle text-accent-subtle-fg">
                          <DynamicIcon name={entry.icon as IconName} size={16} />
                        </span>
                        <span className="min-w-0 flex-1 truncate text-sm font-medium">{name}</span>
                        {reasonKey ? (
                          <Badge variant="accent" className="shrink-0">
                            {t(`files.insight.${reasonKey}` as Parameters<typeof t>[0])}
                          </Badge>
                        ) : null}
                        <ChevronRight
                          size={16}
                          aria-hidden="true"
                          className="shrink-0 text-text-disabled transition-transform duration-(--motion-fast) group-hover:translate-x-0.5 rtl:rotate-180 rtl:group-hover:-translate-x-0.5"
                        />
                      </button>
                    );
                  })}
                </div>
              ) : (
                <p className="rounded-lg border border-dashed border-border px-4 py-3 text-sm text-text-muted">
                  {t("dropzone.noActions")}
                </p>
              )}

              <p className="text-xs text-text-muted">{t("dropzone.privacy")}</p>
            </>
          ) : multi ? (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <Files size={16} className="text-accent" aria-hidden="true" />
                  {t("dropzone.multiTitle", { count: multi.files.length })}
                </DialogTitle>
              </DialogHeader>

              {/* Project-style summary before any processing. */}
              <dl className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-0.5 rounded-lg border border-border-subtle bg-surface p-3">
                  <dt className="text-xs text-text-muted">{t("dropzone.multiTotal")}</dt>
                  <dd dir="ltr" className="text-start text-lg font-semibold tabular-nums">
                    {formatBytes(multi.totalSize)}
                  </dd>
                </div>
                <div className="flex flex-col gap-0.5 rounded-lg border border-border-subtle bg-surface p-3">
                  <dt className="text-xs text-text-muted">{t("dropzone.multiAverage")}</dt>
                  <dd dir="ltr" className="text-start text-lg font-semibold tabular-nums">
                    {formatBytes(Math.round(multi.totalSize / multi.files.length))}
                  </dd>
                </div>
              </dl>
              <div className="flex flex-wrap gap-1.5">
                {[...multi.kinds.entries()].map(([kind, count]) => (
                  <Badge key={kind} variant="neutral">
                    {t(`dropzone.kind.${kind}` as Parameters<typeof t>[0])} × {count}
                  </Badge>
                ))}
              </div>
              <p dir="ltr" className="text-start text-xs text-text-muted">
                ↑ {multi.largest.name} ({formatBytes(multi.largest.size)}) · ↓ {multi.smallest.name} (
                {formatBytes(multi.smallest.size)})
              </p>

              {groupActions.length > 0 ? (
                <div className="flex flex-col gap-1.5" role="list" aria-label={t("dropzone.actionsTitle")}>
                  {groupActions.map(({ entry, reasonKey }) => {
                    const name = t(`${entry.i18nNamespace}.${entry.nameKey}` as Parameters<typeof t>[0]);
                    return (
                      <button
                        key={entry.id}
                        type="button"
                        role="listitem"
                        onClick={() => launch(entry.href, multi.files)}
                        className="group flex items-center gap-3 rounded-lg border border-border-subtle bg-surface px-3 py-2.5 text-start transition-[border-color,background-color] duration-(--motion-fast) ease-(--ease-out) hover:border-border hover:bg-surface-raised"
                      >
                        <span className="flex size-8 shrink-0 items-center justify-center rounded-md bg-accent-subtle text-accent-subtle-fg">
                          <DynamicIcon name={entry.icon as IconName} size={16} />
                        </span>
                        <span className="min-w-0 flex-1 truncate text-sm font-medium">{name}</span>
                        {reasonKey ? (
                          <Badge variant="accent" className="shrink-0">
                            {t(`dropzone.reasons.${reasonKey}` as Parameters<typeof t>[0])}
                          </Badge>
                        ) : null}
                        <ChevronRight
                          size={16}
                          aria-hidden="true"
                          className="shrink-0 text-text-disabled transition-transform duration-(--motion-fast) group-hover:translate-x-0.5 rtl:rotate-180 rtl:group-hover:-translate-x-0.5"
                        />
                      </button>
                    );
                  })}
                </div>
              ) : (
                <p className="rounded-lg border border-dashed border-border px-4 py-3 text-sm text-text-muted">
                  {t("dropzone.multiNoActions")}
                </p>
              )}
              <p className="text-xs text-text-muted">{t("dropzone.privacy")}</p>
            </>
          ) : null}
        </DialogContent>
      </Dialog>
    </>
  );
}
