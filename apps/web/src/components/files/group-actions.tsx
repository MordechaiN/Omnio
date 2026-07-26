"use client";

import { useMemo } from "react";
import { useTranslations } from "next-intl";
import { setPendingFiles } from "@omnio/module-sdk";
import { workspace, type WorkspaceFile } from "@omnio/workspace";
import { DynamicIcon, type IconName } from "lucide-react/dynamic";
import { ChevronRight } from "lucide-react";
import { useRouter } from "@/i18n/navigation";
import { SEARCH_ENTRIES } from "@/generated/registry.search";
import { mimeMatches, normalizeMime } from "@/lib/file-intel";

/**
 * What can be done with several files at once.
 *
 * Selecting files in the workspace led to a panel that said "4 files selected"
 * and offered nothing, while dropping those same four offered six things to do
 * together. The capability was there; it was only reachable on the way in, and
 * after the first day files are already inside. Selecting and then finding no
 * way forward is worse than not being able to select at all.
 *
 * Same rule as the drop panel: a tool qualifies when it declares it takes
 * several files and accepts every one of them.
 */
export function GroupActions({
  files,
  onOpened,
}: {
  files: WorkspaceFile[];
  onOpened?: () => void;
}) {
  const t = useTranslations("files");
  const tRoot = useTranslations();
  const router = useRouter();

  const actions = useMemo(() => {
    const mimes = files.map((file) => normalizeMime(file.mime, file.name));
    return SEARCH_ENTRIES.filter((entry) => entry.tier === "browser")
      .flatMap((entry) => {
        const matched = entry.accepts.find(
          (accept) =>
            accept.multiple === true &&
            mimes.every((mime) => accept.mime.some((pattern) => mimeMatches(pattern, mime))),
        );
        return matched ? [{ entry, score: matched.priority ?? 50 }] : [];
      })
      .sort((a, b) => b.score - a.score)
      .slice(0, 5);
  }, [files]);

  if (actions.length === 0) return null;

  const open = async (href: string) => {
    const handles = (
      await Promise.all(files.map((file) => workspace.openFile(file.id)))
    ).filter((handle): handle is File => handle !== null);
    if (handles.length === 0) return;
    setPendingFiles(handles);
    onOpened?.();
    router.push(href);
  };

  return (
    <section className="flex flex-col gap-1.5">
      <h3 className="text-xs font-semibold uppercase tracking-wide text-text-muted">
        {t("groupActions")}
      </h3>
      {actions.map(({ entry }) => (
        <button
          key={entry.id}
          type="button"
          onClick={() => void open(entry.href)}
          className="group flex items-center gap-2.5 rounded-lg border border-border-subtle px-2.5 py-2 text-start transition-[border-color,background-color] hover:border-border hover:bg-surface-hover motion-safe:duration-150"
        >
          <span className="flex size-7 shrink-0 items-center justify-center rounded-md bg-accent-subtle text-accent-subtle-fg">
            <DynamicIcon name={entry.icon as IconName} size={14} />
          </span>
          <span className="min-w-0 flex-1 truncate text-sm">
            {tRoot(`${entry.i18nNamespace}.${entry.nameKey}` as Parameters<typeof tRoot>[0])}
          </span>
          <ChevronRight
            size={14}
            aria-hidden
            className="shrink-0 text-text-disabled transition-transform group-hover:translate-x-0.5 rtl:rotate-180"
          />
        </button>
      ))}
    </section>
  );
}
