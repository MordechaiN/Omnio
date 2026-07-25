"use client";

import { useCallback, useEffect, useState, useSyncExternalStore } from "react";
import { useTranslations } from "next-intl";
import { setPendingFiles } from "@omnio/module-sdk";
import { runProgress, workspace } from "@omnio/workspace";
import { Button } from "@omnio/ui";
import { Check, X } from "lucide-react";
import { useRouter } from "@/i18n/navigation";
import { SEARCH_ENTRIES } from "@/generated/registry.search";
import { cancelRun, completeStep, getRun, subscribeToRun } from "@/lib/chain-runner";
import { clearHandoff } from "@/lib/provenance";

const BY_TOOL = new Map(SEARCH_ENTRIES.map((entry) => [entry.toolId, entry]));

/**
 * The running-chain strip.
 *
 * Mounted app-wide so a chain survives moving between tools. It listens for the
 * file a tool produces and immediately opens the next step with that file
 * loaded — the automatic handoff that separates a chain from a checklist.
 */
export function ChainBar() {
  const t = useTranslations("files");
  const tRoot = useTranslations();
  const router = useRouter();
  const [advancing, setAdvancing] = useState(false);

  const run = useSyncExternalStore(subscribeToRun, getRun, () => null);

  const label = useCallback(
    (toolId: string) => {
      const entry = BY_TOOL.get(toolId);
      return entry
        ? tRoot(`${entry.i18nNamespace}.${entry.nameKey}` as Parameters<typeof tRoot>[0])
        : toolId;
    },
    [tRoot],
  );

  /** Open a step with its input already in hand. */
  const openStep = useCallback(
    async (toolId: string, fileId: string) => {
      const entry = BY_TOOL.get(toolId);
      if (!entry) return;
      const handle = await workspace.openFile(fileId, toolId);
      if (handle) setPendingFiles([handle]);
      router.push(entry.href);
    },
    [router],
  );

  // A tool produced something while a chain is running: adopt it as the next
  // step's input and move on. Without this the chain would be a list of links.
  useEffect(() => {
    if (!run) return undefined;
    let cancelled = false;

    async function onProduced(event: Event) {
      const detail = (event as CustomEvent<{ blob: Blob; name: string; mime: string }>).detail;
      if (!detail?.blob || cancelled) return;
      setAdvancing(true);
      try {
        const current = getRun();
        if (!current) return;
        // The chain records provenance itself; drop any handoff so the shell's
        // listener does not import the same output a second time.
        clearHandoff();
        const produced = await workspace.import(
          new File([detail.blob], detail.name, { type: detail.mime }),
          { fromFileId: current.fileId, toolId: current.steps[current.position] },
        );
        const nextTool = completeStep(produced.id);
        if (nextTool) await openStep(nextTool, produced.id);
        else router.push("/files");
      } finally {
        if (!cancelled) setAdvancing(false);
      }
    }

    window.addEventListener("omnio:workspace-produce", onProduced);
    return () => {
      cancelled = true;
      window.removeEventListener("omnio:workspace-produce", onProduced);
    };
  }, [run, openStep, router]);

  if (!run) return null;

  const progress = runProgress(run);
  const currentTool = run.steps[run.position];

  return (
    <div
      role="status"
      aria-live="polite"
      className="sticky top-0 z-(--z-sticky) flex flex-wrap items-center gap-3 border-b border-border-subtle bg-accent/10 px-4 py-2 motion-safe:animate-in motion-safe:slide-in-from-top-2 motion-safe:duration-200"
    >
      <span className="text-sm font-medium">{run.name}</span>

      <ol className="flex flex-wrap items-center gap-1.5" aria-label={t("chainSteps")}>
        {run.steps.map((step, index) => {
          const done = index < run.position;
          const active = index === run.position;
          return (
            <li key={`${step}-${index}`} className="flex items-center gap-1.5">
              <span
                className={`flex items-center gap-1 rounded-full px-2 py-0.5 text-xs transition-colors ${
                  done
                    ? "bg-accent/20 text-text-muted"
                    : active
                      ? "bg-accent text-white"
                      : "border border-border text-text-muted"
                }`}
              >
                {done ? <Check className="h-3 w-3" aria-hidden /> : null}
                {label(step)}
              </span>
              {index < run.steps.length - 1 ? (
                <span aria-hidden className="text-text-muted">
                  →
                </span>
              ) : null}
            </li>
          );
        })}
      </ol>

      <span className="text-xs text-text-muted">
        {t("chainProgress", { current: progress.current, total: progress.total })}
      </span>

      <div className="ms-auto flex items-center gap-2">
        {advancing ? <span className="text-xs text-text-muted">{t("chainAdvancing")}</span> : null}
        {currentTool ? (
          <Button size="sm" variant="secondary" onClick={() => void openStep(currentTool, run.fileId)}>
            {t("chainGoToStep")}
          </Button>
        ) : null}
        <Button size="sm" variant="ghost" onClick={cancelRun} aria-label={t("chainStop")}>
          <X className="h-3.5 w-3.5" />
        </Button>
      </div>
    </div>
  );
}
