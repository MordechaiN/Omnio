"use client";

import { useMemo } from "react";
import { useTranslations, useFormatter } from "next-intl";
import { kindOf, primaryInsight, recentActivity } from "@omnio/workspace";
import { useThumbnail, useWorkspace } from "@omnio/workspace/react";
import { FileArchive, FileAudio, FileText, FileVideo, Image as ImageIcon } from "lucide-react";
import { Link } from "@/i18n/navigation";
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
export function ContinueWorking() {
  const t = useTranslations("files");
  const { files } = useWorkspace();
  const recent = useMemo(() => recentActivity(files, 6), [files]);

  if (recent.length === 0) return null;

  return (
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
