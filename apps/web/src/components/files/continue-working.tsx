"use client";

import { useMemo } from "react";
import { useTranslations, useFormatter } from "next-intl";
import { kindOf, primaryInsight, recentActivity, unfinishedWork, workspace } from "@omnio/workspace";
import { useThumbnail, useWorkspace } from "@omnio/workspace/react";
import { FileArchive, FileAudio, FileText, FileVideo, Image as ImageIcon, Undo2 } from "lucide-react";
import { setPendingFiles } from "@omnio/module-sdk";
import { Link, useRouter } from "@/i18n/navigation";
import { SEARCH_ENTRIES } from "@/generated/registry.search";
import { rememberHandoff } from "@/lib/provenance";
import type { WorkspaceFile } from "@omnio/workspace";

const KIND_ICON = {
  image: ImageIcon,
  pdf: FileText,
  text: FileText,
  audio: FileAudio,
  video: FileVideo,
  archive: FileArchive,
  other: FileText,
} as const;

/**
 * "Pick up where you left off."
 *
 * Home used to open on a directory of categories that the sidebar already
 * lists — a website's front page. What someone actually returns for is the work
 * they were in the middle of, so that is what leads now. Renders nothing at all
 * until there is real work to show; an empty shelf is worse than no shelf.
 */
const BY_TOOL = new Map(SEARCH_ENTRIES.map((entry) => [entry.toolId, entry]));

export function ContinueWorking() {
  const t = useTranslations("files");
  const { files, events } = useWorkspace();
  const recent = useMemo(() => recentActivity(files, 6), [files]);
  const unfinished = useMemo(() => unfinishedWork(files, events), [files, events]);

  if (recent.length === 0) return null;

  return (
    <div className="flex flex-col gap-8">
      {unfinished.length > 0 ? <Unfinished items={unfinished} /> : null}

      <section className="flex flex-col gap-3" aria-labelledby="continue-title">
      <h2 id="continue-title" className="text-sm font-semibold">
        {t("continueTitle")}
      </h2>
      <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        {recent.map(({ file }) => (
          <li key={file.id}>
            <RecentCard file={file} files={files} />
          </li>
        ))}
        </ul>
      </section>
    </div>
  );
}

/**
 * Work started and never kept.
 *
 * Deliberately a quiet row rather than a banner or a notification: this is
 * useful information, not an alarm, and something the user chose to abandon
 * must not feel like a failure they are being reminded of.
 */
function Unfinished({ items }: { items: ReturnType<typeof unfinishedWork> }) {
  const t = useTranslations("files");
  const tRoot = useTranslations();
  const router = useRouter();

  const resume = async (fileId: string, toolId: string) => {
    const entry = BY_TOOL.get(toolId);
    if (!entry) return;
    const handle = await workspace.openFile(fileId, toolId);
    if (!handle) return;
    rememberHandoff(fileId, toolId);
    setPendingFiles([handle]);
    router.push(entry.href);
  };

  return (
    <section className="flex flex-col gap-2" aria-labelledby="unfinished-title">
      <h2 id="unfinished-title" className="text-sm font-semibold">
        {t("unfinishedTitle")}
      </h2>
      <ul className="flex flex-col gap-1">
        {items.map((item: (typeof items)[number]) => {
          const entry = BY_TOOL.get(item.toolId);
          if (!entry) return null;
          const toolName = tRoot(
            `${entry.i18nNamespace}.${entry.nameKey}` as Parameters<typeof tRoot>[0],
          );
          return (
            <li key={`${item.file.id}-${item.toolId}`}>
              <button
                type="button"
                onClick={() => void resume(item.file.id, item.toolId)}
                className="flex w-full items-center gap-2 rounded-md border border-border-subtle px-3 py-2 text-start text-sm transition hover:border-border hover:bg-surface-hover motion-safe:duration-150"
              >
                <Undo2 className="h-3.5 w-3.5 shrink-0 text-text-muted" aria-hidden />
                <span className="min-w-0 flex-1 truncate">
                  {t.rich("unfinishedItem", {
                    file: item.file.name,
                    tool: toolName,
                  })}
                </span>
                <span className="shrink-0 text-xs text-text-muted">{t("unfinishedResume")}</span>
              </button>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

function RecentCard({ file, files }: { file: WorkspaceFile; files: WorkspaceFile[] }) {
  const t = useTranslations("files");
  const format = useFormatter();
  const thumb = useThumbnail(file);
  const insight = useMemo(() => primaryInsight(file, files), [file, files]);
  const Icon = KIND_ICON[kindOf(file.mime) as keyof typeof KIND_ICON] ?? FileText;

  return (
    <Link
      href="/files"
      className="group flex flex-col gap-2 rounded-lg border border-border-subtle p-2 transition hover:border-border hover:bg-surface-hover motion-safe:duration-150"
    >
      <span className="flex h-24 items-center justify-center overflow-hidden rounded bg-surface-subtle">
        {thumb ? (
          <img
            src={thumb}
            alt=""
            className="max-h-full max-w-full rounded-sm border border-border-subtle object-contain shadow-1"
          />
        ) : (
          <Icon className="h-7 w-7 text-text-muted" aria-hidden />
        )}
      </span>
      <span className="line-clamp-1 text-xs font-medium">{file.name}</span>
      <span className="text-[11px] text-text-muted">
        {insight
          ? t(`insight.${insight.kind}` as "insight.screenshot")
          : format.relativeTime(new Date(Math.max(file.lastOpenedAt, file.createdAt)), Date.now())}
      </span>
    </Link>
  );
}
