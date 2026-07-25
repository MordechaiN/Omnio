"use client";

import { useMemo } from "react";
import { useTranslations, useFormatter } from "next-intl";
import { setPendingFiles } from "@omnio/module-sdk";
import {
  kindOf,
  primaryInsight,
  recentActivity,
  unfinishedWork,
  workspace,
  type WorkspaceFile,
} from "@omnio/workspace";
import { useThumbnail, useWorkspace } from "@omnio/workspace/react";
import {
  Button,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@omnio/ui";
import {
  FileArchive,
  FileAudio,
  FileText,
  FileVideo,
  Image as ImageIcon,
  MoreHorizontal,
} from "lucide-react";
import { Link, useRouter } from "@/i18n/navigation";
import { SEARCH_ENTRIES } from "@/generated/registry.search";
import { rememberHandoff } from "@/lib/provenance";

const KIND_ICON = {
  image: ImageIcon,
  pdf: FileText,
  text: FileText,
  audio: FileAudio,
  video: FileVideo,
  archive: FileArchive,
  other: FileText,
} as const;

const BY_TOOL = new Map(SEARCH_ENTRIES.map((entry) => [entry.toolId, entry]));

/**
 * The live view of your work at the top of Home.
 *
 * Two ideas that were previously blurred into one, now kept apart:
 *
 *  - **Continue** is work that genuinely invites finishing — a document taken
 *    into a tool that never produced anything. Opening, previewing or
 *    converting a file does not qualify; that work is done.
 *  - **Recent** is simply what you touched last. It is a way back, not a
 *    reminder, so it sits second and stays quiet.
 *
 * Presenting recents as "continue where you left off" implied Omnio knew
 * something it did not, which is the failure this redesign fixes.
 */
export function ContinueWorking() {
  const { files, events, dismissed } = useWorkspace();
  const unfinished = useMemo(
    () => unfinishedWork(files, events, Date.now(), 4, dismissed),
    [files, events, dismissed],
  );
  const recent = useMemo(() => recentActivity(files, 6), [files]);

  if (unfinished.length === 0 && recent.length === 0) return null;

  return (
    <div className="flex flex-col gap-8">
      {unfinished.length > 0 ? <Unfinished items={unfinished} /> : null}
      {recent.length > 0 ? <Recent files={recent.map((entry) => entry.file)} all={files} /> : null}
    </div>
  );
}

/**
 * Work started and never kept.
 *
 * A quiet row rather than a banner: abandoning something is a choice, not a
 * failure to be reminded of. Every item can be waved away, and a whole kind of
 * work can be silenced — a suggestion you cannot dismiss stops being a
 * suggestion and becomes a demand.
 */
function Unfinished({ items }: { items: ReturnType<typeof unfinishedWork> }) {
  const t = useTranslations("files");
  const tRoot = useTranslations();
  const format = useFormatter();
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
    <section className="flex flex-col gap-2" aria-labelledby="continue-title">
      <div className="flex items-baseline justify-between gap-3">
        <h2 id="continue-title" className="text-sm font-semibold">
          {t("continueTitle")}
        </h2>
        {items.length > 1 ? (
          <button
            type="button"
            onClick={() => {
              for (const item of items) void workspace.dismiss(`${item.file.id}:${item.toolId}`);
            }}
            className="text-xs text-text-muted transition-colors hover:text-text"
          >
            {t("continueClearAll")}
          </button>
        ) : null}
      </div>

      <ul className="flex flex-col gap-1">
        {items.map((item: (typeof items)[number]) => {
          const entry = BY_TOOL.get(item.toolId);
          if (!entry) return null;
          const toolName = tRoot(
            `${entry.i18nNamespace}.${entry.nameKey}` as Parameters<typeof tRoot>[0],
          );
          return (
            <li
              key={`${item.file.id}-${item.toolId}`}
              className="group flex items-center gap-2 rounded-lg border border-border-subtle transition-[border-color,background-color] hover:border-border hover:bg-surface-hover motion-safe:duration-150"
            >
              <button
                type="button"
                onClick={() => void resume(item.file.id, item.toolId)}
                className="flex min-w-0 flex-1 items-baseline gap-2 px-3 py-2 text-start text-sm"
              >
                <span className="truncate font-medium">{item.file.name}</span>
                <span className="truncate text-xs text-text-muted">
                  {t("continueIn", { tool: toolName })}
                </span>
                <span className="ms-auto shrink-0 text-xs text-text-muted">
                  {format.relativeTime(new Date(item.at), Date.now())}
                </span>
              </button>

              {/* Controls stay invisible until the row is approached, so the
                  section reads as information rather than as a form. */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    size="sm"
                    variant="ghost"
                    aria-label={t("continueOptions", { file: item.file.name })}
                    className="me-1 opacity-0 transition-opacity focus-visible:opacity-100 group-hover:opacity-100"
                  >
                    <MoreHorizontal className="h-3.5 w-3.5" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem
                    onSelect={() => void workspace.dismiss(`${item.file.id}:${item.toolId}`)}
                  >
                    {t("continueRemove")}
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onSelect={() => void workspace.dismiss(`tool:${item.toolId}`)}>
                    {t("continueForgetTool", { tool: toolName })}
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

/** What you touched last — a way back, deliberately quieter than Continue. */
function Recent({ files, all }: { files: WorkspaceFile[]; all: WorkspaceFile[] }) {
  const t = useTranslations("files");
  return (
    <section className="flex flex-col gap-3" aria-labelledby="recent-title">
      <h2 id="recent-title" className="text-sm font-semibold">
        {t("recentTitle")}
      </h2>
      <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        {files.map((file) => (
          <li key={file.id}>
            <RecentCard file={file} files={all} />
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
