"use client";

import { useCallback, useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import {
  chainsFor,
  defaultChainName,
  learnChains,
  originOf,
  workspace,
  type Chain,
  type WorkspaceFile,
} from "@omnio/workspace";
import { Button } from "@omnio/ui";
import { Play, Sparkles } from "lucide-react";
import { SEARCH_ENTRIES } from "@/generated/registry.search";
import { beginRun } from "@/lib/chain-runner";

const BY_TOOL = new Map(SEARCH_ENTRIES.map((entry) => [entry.toolId, entry]));

/**
 * Chains offered for the selected file.
 *
 * Two sources, deliberately kept apart:
 *  - saved chains, which the user chose to keep;
 *  - sequences Omnio noticed in work already done, offered once and only if
 *    they still have steps left to run.
 *
 * The second is the interesting one: nobody had to build it. Doing the work once
 * is the configuration.
 */
export function ChainSuggestions({
  file,
  files,
  chains,
  onStarted,
}: {
  file: WorkspaceFile;
  files: WorkspaceFile[];
  chains: Chain[];
  onStarted: (toolId: string, fileId: string) => void;
}) {
  const t = useTranslations("files");
  const tRoot = useTranslations();
  const [saving, setSaving] = useState(false);

  const label = useCallback(
    (toolId: string) => {
      const entry = BY_TOOL.get(toolId);
      return entry
        ? tRoot(`${entry.i18nNamespace}.${entry.nameKey}` as Parameters<typeof tRoot>[0])
        : toolId;
    },
    [tRoot],
  );

  const saved = useMemo(() => chainsFor(file, files, chains), [file, files, chains]);

  /** Sequences observed in the workspace that are not saved yet. */
  const discovered = useMemo(() => {
    const known = new Set(chains.map((c) => c.steps.join("→")));
    return learnChains(files)
      .filter((candidate) => !known.has(candidate.steps.join("→")))
      .map((candidate) => ({
        candidate,
        chain: {
          id: `learned:${candidate.steps.join("→")}`,
          name: defaultChainName(candidate.steps, label),
          steps: candidate.steps,
          createdAt: Date.now(),
          learned: true,
          appliesTo: candidate.sourceMimes,
        } satisfies Chain,
      }))
      .flatMap(({ candidate, chain }: { candidate: { occurrences: number }; chain: Chain }) => {
        const offered = chainsFor(file, files, [chain]);
        return offered.length > 0 ? [{ chain, occurrences: candidate.occurrences, remaining: offered[0]!.remaining }] : [];
      })
      .slice(0, 3);
  }, [file, files, chains, label]);

  const start = useCallback(
    (chain: Chain, remaining: string[]) => {
      beginRun(chain, file.id, remaining);
      onStarted(remaining[0]!, file.id);
    },
    [file.id, onStarted],
  );

  const keep = useCallback(
    async (chain: Chain) => {
      setSaving(true);
      try {
        await workspace.saveChain({ ...chain, id: workspace.newId(), createdAt: Date.now() });
      } finally {
        setSaving(false);
      }
    },
    [],
  );

  if (saved.length === 0 && discovered.length === 0) return null;

  return (
    <section className="flex flex-col gap-1.5">
      <h3 className="text-xs font-semibold uppercase tracking-wide text-text-muted">
        {t("chains")}
      </h3>

      {saved.map(({ chain, remaining }) => (
        <div key={chain.id} className="flex items-center gap-2">
          <Button
            size="sm"
            variant="secondary"
            className="min-w-0 flex-1 justify-start"
            onClick={() => start(chain, remaining)}
          >
            <Play className="me-1.5 h-3 w-3 shrink-0" aria-hidden />
            <span className="truncate">{chain.name}</span>
          </Button>
        </div>
      ))}

      {discovered.map(({ chain, occurrences, remaining }: { chain: Chain; occurrences: number; remaining: string[] }) => (
        <div key={chain.id} className="flex flex-col gap-1 rounded-md border border-dashed border-border p-2">
          <p className="flex items-center gap-1.5 text-xs text-text-muted">
            <Sparkles className="h-3 w-3 shrink-0" aria-hidden />
            {occurrences > 1
              ? t("chainNoticedRepeated", { count: occurrences })
              : t("chainNoticed")}
          </p>
          <p className="text-sm">{chain.name}</p>
          <div className="flex flex-wrap gap-1.5">
            <Button size="sm" onClick={() => start(chain, remaining)}>
              {t("chainRun")}
            </Button>
            <Button size="sm" variant="ghost" disabled={saving} onClick={() => void keep(chain)}>
              {t("chainKeep")}
            </Button>
          </div>
        </div>
      ))}
    </section>
  );
}

export { originOf };
