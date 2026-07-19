"use client";

import { useCallback, useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { setPendingFiles } from "@omnio/module-sdk";
import {
  Badge,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  Spinner,
} from "@omnio/ui";
import { DynamicIcon, type IconName } from "lucide-react/dynamic";
import { ChevronRight, FileQuestion, Sparkles } from "lucide-react";
import { useRouter } from "@/i18n/navigation";
import { inspectFile, smartActions, type FileIntel } from "@/lib/file-intel";

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

/**
 * 🪄 Omnio's signature move: drop (or paste) any file anywhere, and the app
 * says what it can do. A full-window drop veil invites the drop; the
 * intelligence sheet previews the file with plain-language facts and an
 * ordered, registry-driven action list. Choosing an action hands the file to
 * the tool, already loaded. Everything happens on this device.
 */
export function FileIntelligence() {
  const t = useTranslations();
  const router = useRouter();
  const [dragging, setDragging] = useState(false);
  const [intel, setIntel] = useState<FileIntel | null>(null);
  const [inspecting, setInspecting] = useState(false);

  const openFile = useCallback(async (file: File) => {
    setInspecting(true);
    try {
      const next = await inspectFile(file);
      setIntel((previous) => {
        if (previous?.previewUrl) URL.revokeObjectURL(previous.previewUrl);
        return next;
      });
    } finally {
      setInspecting(false);
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
      const file = event.dataTransfer?.files[0];
      if (file) void openFile(file);
    };
    const onPaste = (event: ClipboardEvent) => {
      // Only intercept pastes carrying files (screenshots, copied images) —
      // text pastes into inputs stay untouched.
      const file = [...(event.clipboardData?.items ?? [])]
        .find((item) => item.kind === "file")
        ?.getAsFile();
      if (file) {
        event.preventDefault();
        void openFile(file);
      }
    };

    window.addEventListener("dragenter", onDragEnter);
    window.addEventListener("dragleave", onDragLeave);
    window.addEventListener("dragover", onDragOver);
    window.addEventListener("drop", onDrop);
    window.addEventListener("paste", onPaste);
    return () => {
      window.removeEventListener("dragenter", onDragEnter);
      window.removeEventListener("dragleave", onDragLeave);
      window.removeEventListener("dragover", onDragOver);
      window.removeEventListener("drop", onDrop);
      window.removeEventListener("paste", onPaste);
    };
  }, [openFile]);

  const actions = intel ? smartActions(intel).slice(0, 8) : [];

  function launch(href: string) {
    if (intel) setPendingFiles([intel.file]);
    setIntel(null);
    router.push(href);
  }

  function close() {
    if (intel?.previewUrl) URL.revokeObjectURL(intel.previewUrl);
    setIntel(null);
  }

  const facts: string[] = [];
  if (intel) {
    facts.push(formatBytes(intel.size));
    if (intel.facts.width && intel.facts.height) {
      facts.push(`${intel.facts.width}×${intel.facts.height}`);
    }
    if (intel.facts.pageCount !== undefined) {
      facts.push(t("dropzone.pages", { count: intel.facts.pageCount }));
    }
    if (intel.facts.entries) {
      facts.push(t("dropzone.files", { count: intel.facts.entries.length }));
    }
    if (intel.facts.duration !== undefined) {
      facts.push(formatDuration(intel.facts.duration));
    }
    if (intel.facts.jsonValid === false) facts.push(t("dropzone.invalidJson"));
    if (intel.facts.hasExif) facts.push(t("dropzone.hasExif"));
  }

  return (
    <>
      {/* Full-window drop veil. */}
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

      <Dialog open={intel !== null} onOpenChange={(open) => !open && close()}>
        <DialogContent className="max-w-lg">
          {intel ? (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <Sparkles size={16} className="text-accent" aria-hidden="true" />
                  {t("dropzone.dialogTitle")}
                </DialogTitle>
              </DialogHeader>

              {/* Preview + facts */}
              <div className="flex items-start gap-4">
                <div className="flex size-20 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-border-subtle bg-surface-raised">
                  {intel.kind === "image" && intel.previewUrl ? (
                    /* Local object URL — nothing for next/image to optimize. */
                    <img src={intel.previewUrl} alt="" className="size-full object-cover" />
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

              {intel.facts.textPreview ? (
                <pre
                  dir="ltr"
                  className="max-h-28 overflow-hidden rounded-lg border border-border-subtle bg-surface-raised p-3 text-start font-mono text-xs text-text-secondary"
                >
                  {intel.facts.textPreview}
                </pre>
              ) : null}
              {intel.facts.entries && intel.facts.entries.length > 0 ? (
                <ul dir="ltr" className="max-h-28 overflow-hidden rounded-lg border border-border-subtle bg-surface-raised p-3 text-start font-mono text-xs text-text-secondary">
                  {intel.facts.entries.map((name) => (
                    <li key={name} className="truncate">
                      {name}
                    </li>
                  ))}
                </ul>
              ) : null}

              {/* Smart actions */}
              {actions.length > 0 ? (
                <div className="flex flex-col gap-1.5" role="list" aria-label={t("dropzone.actionsTitle")}>
                  {actions.map(({ entry, reasonKey }) => {
                    const name = t(
                      `${entry.i18nNamespace}.${entry.nameKey}` as Parameters<typeof t>[0],
                    );
                    return (
                      <button
                        key={entry.id}
                        type="button"
                        role="listitem"
                        onClick={() => launch(entry.href)}
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
                  {t("dropzone.noActions")}
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
