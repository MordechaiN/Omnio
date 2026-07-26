"use client";

import { useMemo } from "react";
import { useFormatter, useTranslations } from "next-intl";
import { supersededExportOf, type WorkspaceFile } from "@omnio/workspace";
import { Button } from "@omnio/ui";
import { RefreshCw } from "lucide-react";
import { SEARCH_ENTRIES } from "@/generated/registry.search";

const BY_TOOL = new Map(SEARCH_ENTRIES.map((entry) => [entry.toolId, entry]));

/**
 * "This was built from something that has since changed."
 *
 * The same observation the Home surface makes, said at the moment it actually
 * matters: when someone has this file selected and is about to do something with
 * it. A warning that only exists in a list you have to remember to read is a
 * report; a warning that arrives when you reach for the file is an assistant.
 *
 * Nothing here guesses. The file was produced from a specific source, and a file
 * with that exact name and different contents arrived afterwards — both facts
 * are recorded, so the sentence can name the file and the date.
 */
export function FileStaleness({
  file,
  files,
  onRedo,
}: {
  file: WorkspaceFile;
  files: WorkspaceFile[];
  onRedo: (href: string, toolId: string, fileId: string, replaces: WorkspaceFile) => void;
}) {
  const t = useTranslations("discoveries");
  const format = useFormatter();

  const stale = useMemo(() => supersededExportOf(file, files), [file, files]);
  if (!stale) return null;

  const entry = BY_TOOL.get(stale.toolId);

  return (
    <section className="flex flex-col gap-1.5 rounded-md border border-accent-subtle bg-accent-subtle p-2">
      <p className="flex items-start gap-1.5 text-xs">
        <RefreshCw className="mt-0.5 h-3 w-3 shrink-0 text-accent" aria-hidden />
        <span>
          <span className="font-medium">{t("supersededExport.inspectorTitle")}</span>
          <span className="block text-text-muted">
            {t("supersededExport.reason", {
              source: stale.source.name,
              when: format.relativeTime(new Date(stale.replacement.createdAt), Date.now()),
            })}
          </span>
        </span>
      </p>
      {entry ? (
        <Button
          size="sm"
          variant="secondary"
          className="self-start"
          onClick={() => onRedo(entry.href, stale.toolId, stale.replacement.id, stale.result)}
        >
          {t("action.regenerate")}
        </Button>
      ) : null}
    </section>
  );
}
