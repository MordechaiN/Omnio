"use client";

import { useRef, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Button, IconButton, toast } from "@omnio/ui";
import { Copy, Download, FolderOpen, Pencil, Trash2, Upload } from "lucide-react";
import {
  deleteWorkspace,
  duplicateWorkspace,
  exportWorkspaceZip,
  importWorkspaceZip,
  loadWorkspaceFiles,
  renameWorkspace,
  useSavedWorkspaces,
} from "@/lib/saved-workspaces";
import { restoreSession } from "@/lib/session-workspace";
import { formatRelativeTime } from "@/lib/relative-time";
import { NameEmojiDialog } from "./collection-dialog";

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/**
 * 💾 Saved workspaces — the session made durable in IndexedDB, on this device
 * only. Open pours the files back into the live session strip.
 */
export function WorkspacesSection() {
  const t = useTranslations("savedWorkspaces");
  const locale = useLocale();
  const workspaces = useSavedWorkspaces();
  const [renaming, setRenaming] = useState<string | null>(null);
  const importRef = useRef<HTMLInputElement>(null);

  if (workspaces.length === 0) return null;

  return (
    <section className="flex flex-col gap-3" aria-labelledby="saved-workspaces-title">
      <div className="flex items-center justify-between gap-3">
        <h2
          id="saved-workspaces-title"
          className="flex items-center gap-1.5 text-sm font-semibold tracking-wide text-text-secondary uppercase"
        >
          <span aria-hidden="true" className="text-base leading-none normal-case">
            💾
          </span>
          {t("title")}
        </h2>
        <button
          type="button"
          onClick={() => importRef.current?.click()}
          className="flex items-center gap-1 rounded-md px-2 py-1 text-sm font-medium text-accent transition-colors duration-(--motion-fast) hover:bg-accent-subtle"
        >
          <Upload size={14} aria-hidden="true" />
          {t("importAction")}
        </button>
        <input
          ref={importRef}
          type="file"
          accept=".zip,application/zip"
          aria-label={t("importAction")}
          className="sr-only"
          onChange={(event) => {
            const file = event.target.files?.[0];
            event.target.value = "";
            if (!file) return;
            void importWorkspaceZip(file).then((ok) =>
              toast(ok ? t("imported") : t("importInvalid")),
            );
          }}
        />
      </div>
      <ul className="grid gap-2 lg:grid-cols-2">
        {workspaces.map((workspace) => (
          <li
            key={workspace.id}
            className="flex items-center gap-3 rounded-xl border border-border-subtle bg-surface px-4 py-3"
          >
            <div className="flex min-w-0 flex-1 flex-col">
              <span className="truncate text-sm font-semibold">{workspace.name}</span>
              <span className="text-xs text-text-muted">
                {t("meta", { count: workspace.fileCount, size: formatBytes(workspace.totalSize) })}
                {" · "}
                {formatRelativeTime(locale, workspace.updatedAt)}
              </span>
            </div>
            <Button
              type="button"
              size="sm"
              onClick={() =>
                void loadWorkspaceFiles(workspace.id).then((files) => {
                  if (files) restoreSession(files);
                })
              }
            >
              <FolderOpen size={14} aria-hidden="true" className="me-1" />
              {t("open")}
            </Button>
            <IconButton
              aria-label={t("rename")}
              icon={Pencil}
              size="sm"
              variant="ghost"
              onClick={() => setRenaming(workspace.id)}
            />
            <IconButton
              aria-label={t("duplicate")}
              icon={Copy}
              size="sm"
              variant="ghost"
              onClick={() => void duplicateWorkspace(workspace.id, t("copySuffix"))}
            />
            <IconButton
              aria-label={t("export")}
              icon={Download}
              size="sm"
              variant="ghost"
              onClick={() => void exportWorkspaceZip(workspace.id)}
            />
            <IconButton
              aria-label={t("delete")}
              icon={Trash2}
              size="sm"
              variant="ghost"
              onClick={() => void deleteWorkspace(workspace.id)}
            />
            {renaming === workspace.id ? (
              <NameEmojiDialog
                open
                onOpenChange={(open) => !open && setRenaming(null)}
                title={t("renameTitle")}
                submitLabel={t("save")}
                initialName={workspace.name}
                onSubmit={(name) => void renameWorkspace(workspace.id, name)}
              />
            ) : null}
          </li>
        ))}
      </ul>
    </section>
  );
}
