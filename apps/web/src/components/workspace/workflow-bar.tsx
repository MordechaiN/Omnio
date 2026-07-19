"use client";

import { useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { Button } from "@omnio/ui";
import { ArrowLeft, ArrowRight, X } from "lucide-react";
import { useRouter } from "@/i18n/navigation";
import { SEARCH_ENTRIES } from "@/generated/registry.search";
import { useWorkflows } from "@/lib/preferences";

const BY_ID = new Map(SEARCH_ENTRIES.map((entry) => [entry.id, entry]));

/**
 * The workflow runner strip — appears above a tool when the page was opened as
 * a workflow step (?wf=<id>&step=<n>): shows progress and steps forward/back
 * through the sequence. Exiting just drops the query params.
 */
export function WorkflowBar({ currentToolId }: { currentToolId: string }) {
  const t = useTranslations("workflows");
  const router = useRouter();
  const params = useSearchParams();
  const workflows = useWorkflows();

  const workflowId = params.get("wf");
  const step = Number(params.get("step") ?? "0");
  const workflow = workflows.find((w) => w.id === workflowId);
  if (!workflow || Number.isNaN(step) || workflow.steps[step] !== currentToolId) return null;

  const go = (target: number) => {
    const entry = BY_ID.get(workflow.steps[target] ?? "");
    if (entry) router.push(`${entry.href}?wf=${workflow.id}&step=${target}`);
  };

  const isLast = step === workflow.steps.length - 1;

  return (
    <div
      role="region"
      aria-label={t("runnerLabel", { name: workflow.name })}
      className="flex flex-wrap items-center gap-3 rounded-xl border border-accent/40 bg-accent-subtle px-4 py-2.5"
    >
      <span aria-hidden="true" className="text-base leading-none">
        {workflow.emoji}
      </span>
      <span className="text-sm font-medium">{workflow.name}</span>
      <span className="text-sm tabular-nums text-text-muted">
        {t("stepOf", { current: step + 1, total: workflow.steps.length })}
      </span>
      {/* Progress dots — one per step, filled up to the current one. */}
      <div aria-hidden="true" className="flex items-center gap-1">
        {workflow.steps.map((_, index) => (
          <span
            key={index}
            className={`size-1.5 rounded-full ${index <= step ? "bg-accent" : "bg-border"}`}
          />
        ))}
      </div>
      <div className="ms-auto flex items-center gap-1.5">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          disabled={step === 0}
          onClick={() => go(step - 1)}
        >
          <ArrowLeft size={14} aria-hidden="true" className="me-1 rtl:rotate-180" />
          {t("previous")}
        </Button>
        {isLast ? (
          <Button type="button" size="sm" onClick={() => router.push("/")}>
            {t("finish")}
          </Button>
        ) : (
          <Button type="button" size="sm" onClick={() => go(step + 1)}>
            {t("next")}
            <ArrowRight size={14} aria-hidden="true" className="ms-1 rtl:rotate-180" />
          </Button>
        )}
        <Button type="button" variant="ghost" size="sm" onClick={() => router.push("/")}>
          <X size={14} aria-hidden="true" className="me-1" />
          {t("exit")}
        </Button>
      </div>
    </div>
  );
}
