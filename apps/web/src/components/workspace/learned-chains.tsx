"use client";

import { useTranslations } from "next-intl";
import { defaultChainName, workspace } from "@omnio/workspace";
import { useWorkspace } from "@omnio/workspace/react";
import { IconButton } from "@omnio/ui";
import { Trash2, Wand2 } from "lucide-react";
import { SEARCH_ENTRIES } from "@/generated/registry.search";

const BY_TOOL = new Map(SEARCH_ENTRIES.map((entry) => [entry.toolId, entry]));

/**
 * Sequences Omnio learned from work you repeated.
 *
 * These were invisible. Saving one — from a file's suggestions, or from the
 * "Remember this workflow" discovery — wrote it to the workspace and then
 * showed it nowhere, while the Library's Workflows section listed a different,
 * hand-built kind entirely. Two things called a workflow, one of which you
 * could not see, rename or remove: the saved chain simply vanished, and the
 * store's own `removeChain` had no caller anywhere in the product.
 *
 * They belong under the heading people already look under, not in a new screen.
 * There is no "run" here on purpose: a learned sequence applies to a file, so it
 * is offered where the file is. This is the place to confirm one exists and to
 * forget it.
 */
export function LearnedChains() {
  const t = useTranslations();
  const tRoot = useTranslations();
  const { chains } = useWorkspace();

  if (chains.length === 0) return null;

  const label = (toolId: string): string => {
    const entry = BY_TOOL.get(toolId);
    return entry
      ? tRoot(`${entry.i18nNamespace}.${entry.nameKey}` as Parameters<typeof tRoot>[0])
      : toolId;
  };

  return (
    <div className="flex flex-col gap-2">
      <p className="flex items-start gap-2 text-xs text-text-muted">
        <Wand2 className="mt-0.5 size-3.5 shrink-0 text-accent" aria-hidden />
        <span>{t("workflows.learnedHint")}</span>
      </p>
      <ul className="flex flex-col gap-1">
        {chains.map((chain) => (
          <li
            key={chain.id}
            className="group flex items-center gap-2 rounded-lg border border-border-subtle px-3 py-2 transition-[border-color,background-color] hover:border-border hover:bg-surface-hover motion-safe:duration-150"
          >
            <span className="flex min-w-0 flex-1 flex-col">
              <span className="truncate text-sm font-medium">{chain.name}</span>
              {/* A learned chain is named after its own steps, so repeating them
                  underneath said the same thing twice. Shown only once it tells
                  you something the name does not — i.e. after a rename. */}
              {chain.name === defaultChainName(chain.steps, label) ? null : (
                <span className="truncate text-xs text-text-muted">
                  {defaultChainName(chain.steps, label)}
                </span>
              )}
            </span>
            <IconButton
              icon={Trash2}
              aria-label={t("workflows.forget", { name: chain.name })}
              variant="ghost"
              className="shrink-0 opacity-0 transition-opacity focus-visible:opacity-100 group-hover:opacity-100"
              onClick={() => void workspace.removeChain(chain.id)}
            />
          </li>
        ))}
      </ul>
    </div>
  );
}
