"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import {
  Button,
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  IconButton,
  Input,
  Label,
} from "@omnio/ui";
import { DynamicIcon, type IconName } from "lucide-react/dynamic";
import { ArrowDown, ArrowUp, Copy, Pencil, Play, Plus, Trash2, X } from "lucide-react";
import { useRouter } from "@/i18n/navigation";
import { SEARCH_ENTRIES, type SearchEntry } from "@/generated/registry.search";
import {
  createWorkflow,
  deleteWorkflow,
  updateWorkflow,
  useWorkflows,
  type Workflow,
} from "@/lib/preferences";
import { EMOJI_PRESETS } from "@/lib/emoji-presets";
import { LearnedChains } from "./learned-chains";

const BY_ID = new Map(SEARCH_ENTRIES.map((entry) => [entry.id, entry]));

export function workflowStepHref(workflow: Workflow, step: number): string {
  const entry = BY_ID.get(workflow.steps[step] ?? "");
  return entry ? `${entry.href}?wf=${workflow.id}&step=${step}` : "/";
}

function toolName(t: ReturnType<typeof useTranslations<never>>, entry: SearchEntry): string {
  return t(`${entry.i18nNamespace}.${entry.nameKey}` as Parameters<typeof t>[0]);
}

/** Ready-made pipelines — one click seeds the builder, everything editable. */
const TEMPLATES: Array<{ key: string; emoji: string; steps: string[] }> = [
  {
    key: "imageOptimization",
    emoji: "🖼️",
    steps: ["imagekit.image-resize", "imagekit.image-compress", "imagekit.exif-remove"],
  },
  {
    key: "pdfCleanup",
    emoji: "📄",
    steps: ["pdfkit.pdf-rotate", "pdfkit.pdf-delete", "pdfkit.pdf-merge"],
  },
  {
    key: "shareSafely",
    emoji: "🔐",
    steps: ["imagekit.exif-remove", "imagekit.image-compress", "zipkit.zip-create"],
  },
];

/** Builder dialog: name, emoji, and an ordered list of steps. Editing an
 * existing workflow seeds the form and saves in place. */
function WorkflowDialog({
  open,
  onOpenChange,
  editing,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editing?: Workflow;
}) {
  const t = useTranslations();
  const [name, setName] = useState(editing?.name ?? "");
  const [emoji, setEmoji] = useState<string>(editing?.emoji ?? EMOJI_PRESETS[6]);
  const [steps, setSteps] = useState<string[]>(editing?.steps ?? []);
  const [query, setQuery] = useState("");

  const matches =
    query.trim().length < 2
      ? []
      : SEARCH_ENTRIES.filter((entry) => {
          const label = toolName(t, entry).toLowerCase();
          const q = query.trim().toLowerCase();
          return (
            label.includes(q) || entry.keywords.some((keyword) => keyword.toLowerCase().includes(q))
          );
        }).slice(0, 5);

  function move(index: number, delta: -1 | 1) {
    setSteps((previous) => {
      const next = [...previous];
      const target = index + delta;
      if (target < 0 || target >= next.length) return previous;
      [next[index], next[target]] = [next[target]!, next[index]!];
      return next;
    });
  }

  function submit() {
    if (name.trim() === "" || steps.length < 2) return;
    if (editing) {
      updateWorkflow(editing.id, { name: name.trim(), emoji, steps });
    } else {
      createWorkflow(name.trim(), emoji, steps);
    }
    onOpenChange(false);
    setName("");
    setSteps([]);
    setQuery("");
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{t("workflows.newTitle")}</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-4">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-sm text-text-muted">{t("workflows.templatesLabel")}</span>
            {TEMPLATES.map((template) => (
              <button
                key={template.key}
                type="button"
                onClick={() => {
                  setName(t(`workflows.templates.${template.key}` as Parameters<typeof t>[0]));
                  setEmoji(template.emoji);
                  setSteps(template.steps.filter((id) => BY_ID.has(id)));
                }}
                className="flex items-center gap-1 rounded-md border border-border-subtle px-2 py-1 text-xs transition-colors duration-(--motion-fast) hover:border-border hover:bg-surface-raised"
              >
                <span aria-hidden="true">{template.emoji}</span>
                {t(`workflows.templates.${template.key}` as Parameters<typeof t>[0])}
              </button>
            ))}
          </div>

          <div className="flex items-end gap-3">
            <div className="flex flex-1 flex-col gap-1.5">
              <Label htmlFor="wf-name">{t("collections.nameLabel")}</Label>
              <Input
                id="wf-name"
                value={name}
                autoFocus
                onChange={(event) => setName(event.target.value)}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="wf-emoji">{t("collections.emojiLabel")}</Label>
              <select
                id="wf-emoji"
                value={emoji}
                onChange={(event) => setEmoji(event.target.value)}
                className="h-(--control-h-md) rounded-sm border border-border bg-surface px-2 text-lg"
              >
                {EMOJI_PRESETS.map((preset) => (
                  <option key={preset} value={preset}>
                    {preset}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="wf-search">{t("workflows.addStep")}</Label>
            <Input
              id="wf-search"
              value={query}
              placeholder={t("workflows.addStepPlaceholder")}
              onChange={(event) => setQuery(event.target.value)}
            />
            {matches.length > 0 ? (
              <ul className="flex flex-col overflow-hidden rounded-lg border border-border-subtle">
                {matches.map((entry) => (
                  <li key={entry.id}>
                    <button
                      type="button"
                      onClick={() => {
                        setSteps((previous) => [...previous, entry.id]);
                        setQuery("");
                      }}
                      className="flex w-full items-center gap-2 px-3 py-2 text-start text-sm transition-colors duration-(--motion-fast) hover:bg-surface-raised"
                    >
                      <DynamicIcon name={entry.icon as IconName} size={14} className="text-text-muted" />
                      {toolName(t, entry)}
                    </button>
                  </li>
                ))}
              </ul>
            ) : null}
          </div>

          {steps.length > 0 ? (
            <ol className="flex flex-col gap-1.5">
              {steps.map((id, index) => {
                const entry = BY_ID.get(id);
                if (!entry) return null;
                return (
                  <li
                    key={`${id}-${index}`}
                    className="flex items-center gap-2 rounded-lg border border-border-subtle bg-surface px-3 py-1.5 text-sm"
                  >
                    <span className="w-5 shrink-0 text-center text-xs tabular-nums text-text-muted">
                      {index + 1}
                    </span>
                    <span className="min-w-0 flex-1 truncate">{toolName(t, entry)}</span>
                    <IconButton
                      aria-label={t("workflows.moveUp")}
                      icon={ArrowUp}
                      size="sm"
                      variant="ghost"
                      disabled={index === 0}
                      onClick={() => move(index, -1)}
                    />
                    <IconButton
                      aria-label={t("workflows.moveDown")}
                      icon={ArrowDown}
                      size="sm"
                      variant="ghost"
                      disabled={index === steps.length - 1}
                      onClick={() => move(index, 1)}
                    />
                    <IconButton
                      aria-label={t("workflows.duplicateStep")}
                      icon={Copy}
                      size="sm"
                      variant="ghost"
                      onClick={() =>
                        setSteps((previous) => [
                          ...previous.slice(0, index + 1),
                          previous[index]!,
                          ...previous.slice(index + 1),
                        ])
                      }
                    />
                    <IconButton
                      aria-label={t("workflows.removeStep")}
                      icon={X}
                      size="sm"
                      variant="ghost"
                      onClick={() => setSteps((previous) => previous.filter((_, i) => i !== index))}
                    />
                  </li>
                );
              })}
            </ol>
          ) : (
            <p className="text-sm text-text-muted">{t("workflows.stepsHint")}</p>
          )}
        </div>
        <DialogFooter>
          <Button type="button" variant="secondary" onClick={() => onOpenChange(false)}>
            {t("collections.cancel")}
          </Button>
          <Button type="button" onClick={submit} disabled={name.trim() === "" || steps.length < 2}>
            {t("collections.create")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/**
 * ⚡ Workflows — saved tool sequences, stepped through one tool at a time with
 * a progress bar on each page. Local-only, like everything personal.
 */
export function WorkflowsSection() {
  const t = useTranslations();
  const router = useRouter();
  const workflows = useWorkflows();
  const [creating, setCreating] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const editing = workflows.find((workflow) => workflow.id === editingId);

  return (
    <section className="flex flex-col gap-3" aria-labelledby="workflows-title">
      <div className="flex items-center justify-between gap-3">
        <h2
          id="workflows-title"
          className="flex items-center gap-1.5 text-sm font-semibold tracking-wide text-text-secondary uppercase"
        >
          <span aria-hidden="true" className="text-base leading-none normal-case">
            ⚡
          </span>
          {t("workflows.title")}
        </h2>
        <button
          type="button"
          onClick={() => setCreating(true)}
          className="flex items-center gap-1 rounded-md px-2 py-1 text-sm font-medium text-accent transition-colors duration-(--motion-fast) hover:bg-accent-subtle"
        >
          <Plus size={14} aria-hidden="true" />
          {t("workflows.new")}
        </button>
      </div>

      {/* Sequences Omnio learned from repeated work. Same heading, because they
          are the same idea to the person reading it — one they built, one they
          performed. Renders nothing until there is one. */}
      <LearnedChains />

      {workflows.length === 0 ? (
        <p className="flex items-center gap-2 rounded-lg border border-dashed border-border px-4 py-3 text-sm text-text-muted">
          {t("workflows.emptyHint")}
        </p>
      ) : (
        <ul className="grid gap-2 lg:grid-cols-2">
          {workflows.map((workflow) => {
            const names = workflow.steps
              .map((id) => BY_ID.get(id))
              .filter((entry): entry is SearchEntry => entry !== undefined)
              .map((entry) => toolName(t, entry));
            return (
              <li
                key={workflow.id}
                className="flex items-center gap-3 rounded-xl border border-border-subtle bg-surface px-4 py-3"
              >
                <span aria-hidden="true" className="text-lg leading-none">
                  {workflow.emoji}
                </span>
                <div className="flex min-w-0 flex-1 flex-col">
                  <span className="truncate text-sm font-semibold">{workflow.name}</span>
                  <span dir="auto" className="truncate text-xs text-text-muted">
                    {names.join(" → ")}
                  </span>
                </div>
                <Button
                  type="button"
                  size="sm"
                  onClick={() => router.push(workflowStepHref(workflow, 0))}
                >
                  <Play size={14} aria-hidden="true" className="me-1" />
                  {t("workflows.start")}
                </Button>
                <IconButton
                  aria-label={t("workflows.edit")}
                  icon={Pencil}
                  size="sm"
                  variant="ghost"
                  onClick={() => setEditingId(workflow.id)}
                />
                <IconButton
                  aria-label={t("workflows.delete")}
                  icon={Trash2}
                  size="sm"
                  variant="ghost"
                  onClick={() => deleteWorkflow(workflow.id)}
                />
              </li>
            );
          })}
        </ul>
      )}

      <WorkflowDialog open={creating} onOpenChange={setCreating} />
      {editing ? (
        <WorkflowDialog
          key={editing.id}
          open
          onOpenChange={(open) => !open && setEditingId(null)}
          editing={editing}
        />
      ) : null}
    </section>
  );
}
