"use client";

import { useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Badge, Checkbox, IconButton, toast } from "@omnio/ui";
import { FileText, Pin, Save, Sparkles, Trash2, X } from "lucide-react";
import {
  clearExceptPinned,
  clearSession,
  getSessionFiles,
  removeSessionFiles,
  togglePinned,
  useSessionFiles,
} from "@/lib/session-workspace";
import { saveWorkspace } from "@/lib/saved-workspaces";
import { formatRelativeTime } from "@/lib/relative-time";
import { NameEmojiDialog } from "./collection-dialog";

const VISIBLE = 8;

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function downloadFile(file: File) {
  const url = URL.createObjectURL(file);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = file.name;
  anchor.click();
  URL.revokeObjectURL(url);
}

/**
 * 🗃️ The session workspace — every file dropped or produced this session, in
 * one strip. A row re-opens the intelligence sheet for that file, so nothing
 * ever has to be dragged twice. Pinned files (⭐) survive "clear except
 * pinned" and are never evicted by the size cap. Selecting rows exposes bulk
 * download/remove. Memory only; a reload starts a fresh session.
 */
export function SessionStrip() {
  const t = useTranslations("workspaceSession");
  const locale = useLocale();
  const files = useSessionFiles();
  const [saving, setSaving] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());

  if (files.length === 0) return null;

  // Pinned rows float to the top; recency otherwise (the store already keeps
  // insertion order, so this is a stable partition, not a re-sort by time).
  const ordered = [...files].sort((a, b) => Number(b.pinned) - Number(a.pinned));
  const visible = ordered.slice(0, VISIBLE);
  const hasSelection = selected.size > 0;

  function toggleSelected(id: string) {
    setSelected((previous) => {
      const next = new Set(previous);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function bulkDownload() {
    for (const entry of files) if (selected.has(entry.id)) downloadFile(entry.file);
  }

  function bulkRemove() {
    removeSessionFiles([...selected]);
    setSelected(new Set());
  }

  return (
    <section className="animate-rise flex flex-col gap-3" aria-labelledby="session-title">
      <div className="flex items-center justify-between gap-3">
        <h2
          id="session-title"
          className="flex items-center gap-1.5 text-sm font-semibold tracking-wide text-text-secondary uppercase"
        >
          <span aria-hidden="true" className="text-base leading-none normal-case">
            🗃️
          </span>
          {t("title")}
        </h2>
        <div className="flex items-center gap-1">
          {hasSelection ? (
            <>
              <span className="me-1 text-xs text-text-muted">{t("selectedCount", { count: selected.size })}</span>
              <button
                type="button"
                onClick={bulkDownload}
                className="rounded-md px-2 py-1 text-xs font-medium text-accent transition-colors duration-(--motion-fast) hover:bg-accent-subtle"
              >
                {t("downloadSelected")}
              </button>
              <button
                type="button"
                onClick={bulkRemove}
                className="rounded-md px-2 py-1 text-xs font-medium text-danger transition-colors duration-(--motion-fast) hover:bg-surface-raised"
              >
                {t("removeSelected")}
              </button>
            </>
          ) : (
            <>
              <IconButton
                aria-label={t("saveWorkspace")}
                icon={Save}
                size="sm"
                variant="ghost"
                onClick={() => setSaving(true)}
              />
              <IconButton
                aria-label={t("clearExceptPinned")}
                icon={Trash2}
                size="sm"
                variant="ghost"
                onClick={clearExceptPinned}
              />
              <IconButton
                aria-label={t("clear")}
                icon={X}
                size="sm"
                variant="ghost"
                onClick={clearSession}
              />
            </>
          )}
        </div>
      </div>
      <NameEmojiDialog
        open={saving}
        onOpenChange={setSaving}
        title={t("saveTitle")}
        submitLabel={t("saveAction")}
        onSubmit={(name) => {
          void saveWorkspace(
            name,
            getSessionFiles().map(({ file, origin }) => ({ file, origin })),
          ).then(() => toast(t("saved", { name })));
        }}
      />
      <ul className="flex flex-col gap-1.5">
        {visible.map((entry) => (
          <li key={entry.id} className="flex items-center gap-2">
            <Checkbox
              aria-label={t("selectFile", { name: entry.file.name })}
              checked={selected.has(entry.id)}
              onCheckedChange={() => toggleSelected(entry.id)}
            />
            <button
              type="button"
              onClick={() =>
                window.dispatchEvent(new CustomEvent("omnio:inspect", { detail: [entry.file] }))
              }
              className="group flex min-w-0 flex-1 items-center gap-3 rounded-lg border border-border-subtle bg-surface px-3 py-2 text-start transition-[border-color,background-color] duration-(--motion-fast) ease-(--ease-out) hover:border-border hover:bg-surface-raised"
            >
              {entry.origin === "output" ? (
                <Sparkles size={15} aria-hidden="true" className="shrink-0 text-accent" />
              ) : (
                <FileText size={15} aria-hidden="true" className="shrink-0 text-text-muted" />
              )}
              <span dir="ltr" className="min-w-0 flex-1 truncate text-start text-sm font-medium">
                {entry.file.name}
              </span>
              {entry.origin === "output" ? (
                <Badge variant="accent" className="shrink-0">
                  {t("output")}
                </Badge>
              ) : null}
              <Badge variant="neutral" className="shrink-0">
                {formatBytes(entry.file.size)}
              </Badge>
              <span className="shrink-0 text-xs text-text-muted">
                {formatRelativeTime(locale, entry.at)}
              </span>
            </button>
            <IconButton
              aria-label={entry.pinned ? t("unpin") : t("pin")}
              aria-pressed={entry.pinned}
              icon={Pin}
              size="sm"
              variant="ghost"
              className={entry.pinned ? "text-accent" : undefined}
              onClick={() => togglePinned(entry.id)}
            />
            <IconButton
              aria-label={t("remove")}
              icon={Trash2}
              size="sm"
              variant="ghost"
              onClick={() => removeSessionFiles([entry.id])}
            />
          </li>
        ))}
      </ul>
      {files.length > VISIBLE ? (
        <p className="text-xs text-text-muted">{t("moreFiles", { count: files.length - VISIBLE })}</p>
      ) : null}
      <p className="text-xs text-text-muted">{t("hint")}</p>
    </section>
  );
}
