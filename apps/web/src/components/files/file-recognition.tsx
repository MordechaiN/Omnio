"use client";

import { useMemo } from "react";
import { useTranslations, useFormatter } from "next-intl";
import { recognize, workspace, type WorkspaceEvent, type WorkspaceFile } from "@omnio/workspace";
import { Button } from "@omnio/ui";
import { RotateCcw } from "lucide-react";
import { SEARCH_ENTRIES } from "@/generated/registry.search";

const BY_TOOL = new Map(SEARCH_ENTRIES.map((entry) => [entry.toolId, entry]));

/**
 * "You've had this file before — and here's what you made from it."
 *
 * The point is not the label, it is the file underneath it. Re-running OCR on a
 * scan you already OCR'd produces the same bytes after the same wait, so the
 * useful move is to hand back the finished work rather than to congratulate
 * Omnio for noticing.
 *
 * Recognition is exact — identical content, not a similar name — so the claim
 * can be stated plainly with a date, which is what keeps it from feeling like a
 * guess.
 */
export function FileRecognition({
  file,
  files,
  events,
  onOpenResult,
}: {
  file: WorkspaceFile;
  files: WorkspaceFile[];
  events: WorkspaceEvent[];
  onOpenResult: (fileId: string) => void;
}) {
  const t = useTranslations("files");
  const tRoot = useTranslations();
  const format = useFormatter();

  const found = useMemo(() => recognize(file, files, events), [file, files, events]);
  if (!found) return null;

  return (
    <section className="flex flex-col gap-2 rounded-lg border border-accent/30 bg-accent/5 p-3 motion-safe:animate-in motion-safe:fade-in motion-safe:duration-300">
      <p className="flex items-start gap-1.5 text-xs">
        <RotateCcw className="mt-0.5 h-3 w-3 shrink-0 text-accent" aria-hidden />
        <span>
          <span className="block font-medium">{t("seenBefore")}</span>
          <span className="block text-text-muted">
            {t("seenBeforeReason", {
              when: format.relativeTime(new Date(found.firstSeenAt), Date.now()),
            })}
          </span>
        </span>
      </p>

      <ul className="flex flex-col gap-1">
        {found.results.slice(0, 3).map((result) => {
          const entry = BY_TOOL.get(result.toolId);
          const toolName = entry
            ? tRoot(`${entry.i18nNamespace}.${entry.nameKey}` as Parameters<typeof tRoot>[0])
            : result.toolId;
          return (
            <li key={result.file.id}>
              <Button
                size="sm"
                variant="secondary"
                className="w-full justify-start"
                onClick={() => {
                  void workspace.openFile(result.file.id);
                  onOpenResult(result.file.id);
                }}
              >
                <span className="min-w-0 truncate">
                  {t("seenBeforeResult", { tool: toolName })}
                </span>
              </Button>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
