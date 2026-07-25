"use client";

import { useMemo } from "react";
import { useTranslations } from "next-intl";
import { insightsFor, type WorkspaceFile } from "@omnio/workspace";
import { Button } from "@omnio/ui";
import { Lightbulb } from "lucide-react";
import { SEARCH_ENTRIES } from "@/generated/registry.search";

const BY_TOOL = new Map(SEARCH_ENTRIES.map((entry) => [entry.toolId, entry]));

/**
 * What Omnio noticed about this file.
 *
 * Every line states its evidence. A suggestion the user cannot account for
 * reads as guessing, and one wrong guess costs more trust than ten useful
 * observations earn — so the reason is not a tooltip or a detail view, it is
 * the sentence itself.
 */
export function FileInsights({
  file,
  files,
  onOpenWith,
}: {
  file: WorkspaceFile;
  files: WorkspaceFile[];
  onOpenWith: (href: string, toolId: string) => void;
}) {
  const t = useTranslations("files");
  const tRoot = useTranslations();

  const insights = useMemo(() => insightsFor(file, files).slice(0, 2), [file, files]);
  if (insights.length === 0) return null;

  return (
    <section className="flex flex-col gap-1.5">
      <h3 className="text-xs font-semibold uppercase tracking-wide text-text-muted">
        {t("noticed")}
      </h3>
      {insights.map((insight) => {
        const entry = insight.suggests ? BY_TOOL.get(insight.suggests) : undefined;
        const toolName = entry
          ? tRoot(`${entry.i18nNamespace}.${entry.nameKey}` as Parameters<typeof tRoot>[0])
          : null;
        return (
          <div
            key={insight.kind}
            className="flex flex-col gap-1.5 rounded-md bg-surface-subtle p-2 motion-safe:animate-in motion-safe:fade-in motion-safe:duration-200"
          >
            <p className="flex items-start gap-1.5 text-xs">
              <Lightbulb className="mt-0.5 h-3 w-3 shrink-0 text-accent" aria-hidden />
              <span>
                <span className="font-medium">
                  {t(`insight.${insight.kind}` as "insight.screenshot")}
                </span>
                <span className="block text-text-muted">{insight.reason}</span>
              </span>
            </p>
            {entry && toolName ? (
              <Button
                size="sm"
                variant="secondary"
                className="self-start"
                onClick={() => onOpenWith(entry.href, entry.toolId)}
              >
                {toolName}
              </Button>
            ) : null}
          </div>
        );
      })}
    </section>
  );
}
