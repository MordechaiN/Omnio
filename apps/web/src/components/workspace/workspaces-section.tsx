"use client";

import { useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Button, IconButton } from "@omnio/ui";
import { Copy, FolderOpen, Pencil, Trash2 } from "lucide-react";
import {
  deleteWorkspace,
  duplicateWorkspace,
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

  if (workspaces.length === 0) return null;

  return (
    <section className="flex flex-col gap-3" aria-labelledby="saved-workspaces-title">
      <h2
        id="saved-workspaces-title"
        className="flex items-center gap-1.5 text-sm font-semibold tracking-wide text-text-secondary uppercase"
      >
        <span aria-hidden="true" className="text-base leading-none normal-case">
          💾
        </span>
        {t("title")}
      </h2>
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
