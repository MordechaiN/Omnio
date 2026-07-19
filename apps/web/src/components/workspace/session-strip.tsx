"use client";

import { useLocale, useTranslations } from "next-intl";
import { Badge, IconButton } from "@omnio/ui";
import { FileText, Sparkles, Trash2, X } from "lucide-react";
import { clearSession, removeSessionFile, useSessionFiles } from "@/lib/session-workspace";
import { formatRelativeTime } from "@/lib/relative-time";

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/**
 * 🗃️ The session workspace — every file dropped or produced this session, in
 * one strip. A row re-opens the intelligence sheet for that file, so nothing
 * ever has to be dragged twice. Memory only; a reload starts a fresh session.
 */
export function SessionStrip() {
  const t = useTranslations("workspaceSession");
  const locale = useLocale();
  const files = useSessionFiles();

  if (files.length === 0) return null;

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
        <IconButton
          aria-label={t("clear")}
          icon={Trash2}
          size="sm"
          variant="ghost"
          onClick={clearSession}
        />
      </div>
      <ul className="flex flex-col gap-1.5">
        {files.slice(0, 6).map((entry) => (
          <li key={entry.id} className="flex items-center gap-2">
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
              aria-label={t("remove")}
              icon={X}
              size="sm"
              variant="ghost"
              onClick={() => removeSessionFile(entry.id)}
            />
          </li>
        ))}
      </ul>
      <p className="text-xs text-text-muted">{t("hint")}</p>
    </section>
  );
}
