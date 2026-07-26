"use client";

import { useMemo, useState } from "react";
import { useFormatter, useTranslations } from "next-intl";
import { setPendingFiles } from "@omnio/module-sdk";
import {
  actionFor,
  defaultChainName,
  discover,
  isHandoff,
  workspace,
  type CollectionName,
  type Discovery,
  type WorkspaceFile,
} from "@omnio/workspace";
import { useWorkspace } from "@omnio/workspace/react";
import {
  Button,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@omnio/ui";
import {
  Check,
  Clock,
  Files as FilesIcon,
  Footprints,
  Image as ImageIcon,
  MoreHorizontal,
  Repeat,
  RefreshCw,
  Workflow,
} from "lucide-react";
import { useRouter } from "@/i18n/navigation";
import { SEARCH_ENTRIES } from "@/generated/registry.search";
import { rememberHandoff } from "@/lib/provenance";

const BY_TOOL = new Map(SEARCH_ENTRIES.map((entry) => [entry.toolId, entry]));

const KIND_ICON = {
  "superseded-export": RefreshCw,
  "document-versions": FilesIcon,
  "image-sizes": ImageIcon,
  "work-session": Clock,
  "stepping-stones": Footprints,
  "repeated-sequence": Workflow,
  habit: Repeat,
} as const;

/** How many names to show before collapsing the rest into a count. */
const NAMES_SHOWN = 3;

/**
 * What Omnio noticed while you were working.
 *
 * Deliberately built as the opposite of a notifications panel. It never appears
 * over anything, never counts unread items, never animates for attention, and
 * renders nothing at all when there is nothing worth saying — which, in a young
 * workspace, is most of the time. Being empty is a correct state here, not a
 * gap to be filled with filler observations.
 *
 * Every row is one sentence and its evidence. The evidence is not a tooltip or a
 * "why am I seeing this?" link, because a reason you have to go and find is a
 * reason the interface did not really give you.
 */
/**
 * What just happened, and how to take it back.
 *
 * `run` is absent when an action genuinely cannot be undone, which is the whole
 * reason this carries a label rather than always a button.
 */
export interface Undo {
  label: string;
  run?: () => Promise<void>;
}

export function WorkspaceDiscoveries() {
  const t = useTranslations("discoveries");
  const { files, events, chains, dismissed, ready } = useWorkspace();
  const [receipts, setReceipts] = useState<Record<string, Undo>>({});

  const discoveries = useMemo(
    () => (ready ? discover(files, events, { dismissed, chains }) : []),
    [files, events, chains, dismissed, ready],
  );

  if (discoveries.length === 0) return null;

  return (
    <section className="flex flex-col gap-2" aria-labelledby="discoveries-title">
      <h2 id="discoveries-title" className="text-sm font-semibold">
        {t("title")}
      </h2>
      <ul className="flex flex-col gap-1">
        {discoveries.map((discovery) => (
          <li key={discovery.id}>
            <DiscoveryRow
              discovery={discovery}
              receipt={receipts[discovery.id]}
              onDone={(undo) => setReceipts((prev) => ({ ...prev, [discovery.id]: undo }))}
              onUndone={() =>
                setReceipts((prev) => {
                  const { [discovery.id]: _removed, ...rest } = prev;
                  return rest;
                })
              }
            />
          </li>
        ))}
      </ul>
    </section>
  );
}

/**
 * One observation.
 *
 * The row is not a button. Some discoveries have an obvious next action and some
 * are simply worth knowing, and dressing the second kind up as something to
 * click would be pretending every observation is a task.
 */
function DiscoveryRow({
  discovery,
  receipt,
  onDone,
  onUndone,
}: {
  discovery: Discovery;
  receipt?: Undo;
  onDone: (undo: Undo) => void;
  onUndone: () => void;
}) {
  const t = useTranslations("discoveries");
  const Icon = KIND_ICON[discovery.kind];
  // The only discovery that prevents a mistake rather than saving effort, so it
  // is the only one that earns colour. If everything is highlighted, nothing is.
  const notable = discovery.kind === "superseded-export";

  return (
    <div className="group flex items-start gap-2.5 rounded-lg border border-border-subtle px-3 py-2 transition-[border-color,background-color] hover:border-border hover:bg-surface-hover motion-safe:duration-150">
      <Icon
        className={`mt-0.5 h-3.5 w-3.5 shrink-0 ${notable ? "text-accent" : "text-text-muted"}`}
        aria-hidden
      />
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <Headline discovery={discovery} />
        <Reason discovery={discovery} />
        <Subjects discovery={discovery} />
        {receipt ? (
          <Receipt receipt={receipt} onUndone={onUndone} />
        ) : (
          <Action discovery={discovery} onDone={onDone} />
        )}
      </div>

      {/* Kept invisible until the row is approached, so the section reads as
          information rather than as a queue of things to process. */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            size="sm"
            variant="ghost"
            aria-label={t("options")}
            className="-me-1 shrink-0 opacity-0 transition-opacity focus-visible:opacity-100 group-hover:opacity-100"
          >
            <MoreHorizontal className="h-3.5 w-3.5" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onSelect={() => void workspace.dismiss(discovery.id)}>
            {t("dismiss")}
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onSelect={() => void workspace.dismiss(`kind:${discovery.kind}`)}>
            {t("dismissKind")}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}

/** The observation itself, in one line. */
function Headline({ discovery }: { discovery: Discovery }) {
  const t = useTranslations("discoveries");
  const format = useFormatter();
  const toolName = useToolName();

  const text = (() => {
    switch (discovery.kind) {
      case "superseded-export":
        return t("supersededExport.title", { name: discovery.result.name });
      case "document-versions":
        return t("documentVersions.title", { name: discovery.stem, count: discovery.versionCount });
      case "image-sizes":
        return t("imageSizes.title", { count: discovery.dimensions.length });
      case "work-session":
        return t("workSession.title", {
          count: discovery.fileCount,
          when: format.dateTime(new Date(discovery.startedAt), {
            weekday: "long",
            hour: "numeric",
            minute: "numeric",
          }),
        });
      case "stepping-stones":
        return t("steppingStones.title", { count: discovery.files.length });
      case "repeated-sequence":
        return t("repeatedSequence.title", {
          steps: discovery.steps.map(toolName).join(" → "),
        });
      case "habit":
        return t("habit.title", { tool: toolName(discovery.toolId) });
    }
  })();

  return <span className="text-sm font-medium">{text}</span>;
}

/**
 * The evidence. Never omitted — this is the sentence that answers "why is Omnio
 * telling me this?", and without it every row is just an assertion.
 */
function Reason({ discovery }: { discovery: Discovery }) {
  const t = useTranslations("discoveries");
  const format = useFormatter();
  const toolName = useToolName();

  const text = (() => {
    switch (discovery.kind) {
      case "superseded-export":
        return t("supersededExport.reason", {
          source: discovery.source.name,
          when: format.relativeTime(new Date(discovery.replacement.createdAt), Date.now()),
        });
      case "document-versions":
        return t("documentVersions.reason", {
          newest: discovery.newest.name,
          when: format.relativeTime(new Date(discovery.newest.createdAt), Date.now()),
        });
      case "image-sizes":
        return t("imageSizes.reason", {
          sizes: discovery.dimensions.join(", "),
          saving: formatBytes(discovery.reclaimableBytes),
        });
      case "work-session":
        return discovery.toolIds.length > 0
          ? t("workSession.reasonWithTools", {
              duration: minutesBetween(discovery.startedAt, discovery.endedAt),
              tools: discovery.toolIds.map(toolName).join(", "),
            })
          : t("workSession.reason", {
              duration: minutesBetween(discovery.startedAt, discovery.endedAt),
            });
      case "stepping-stones":
        return t("steppingStones.reason", { size: formatBytes(discovery.reclaimableBytes) });
      case "repeated-sequence":
        return t("repeatedSequence.reason", { count: discovery.occurrences });
      case "habit":
        return t("habit.reason", {
          applied: discovery.applied,
          total: discovery.total,
          pending: discovery.pending.length,
        });
    }
  })();

  return <span className="text-xs text-text-muted">{text}</span>;
}

/**
 * Which files this is actually about.
 *
 * This replaced a "Show these files" link that navigated to the unfiltered file
 * list — a label that promised something the destination did not deliver. Naming
 * them here is both more honest and more useful: the answer to "which ones?" is
 * the names, and reading them costs no navigation at all.
 *
 * Omitted for a superseded export, whose reason already names both files.
 */
function Subjects({ discovery }: { discovery: Discovery }) {
  const t = useTranslations("discoveries");
  if (discovery.kind === "superseded-export" || discovery.files.length === 0) return null;

  const shown = discovery.files.slice(0, NAMES_SHOWN);
  const rest = discovery.files.length - shown.length;

  return (
    <p className="truncate text-xs text-text-disabled">
      {shown.map((file) => file.name).join(" · ")}
      {rest > 0 ? ` ${t("more", { count: rest })}` : ""}
    </p>
  );
}

/**
 * The next move.
 *
 * One button, chosen by `actionFor` rather than by this component — the decision
 * about what is safe belongs with the workspace, not with the thing drawing it.
 * The label states the outcome ("Group as a collection") instead of the
 * mechanism, and an action that cannot be taken back says so in the same breath,
 * before it is clicked rather than after.
 *
 * Actions the workspace can perform itself finish here, in place, with an undo
 * where one is honest. Actions that genuinely need a tool open it with the files
 * already loaded.
 */
function Action({ discovery, onDone }: { discovery: Discovery; onDone: (undo: Undo) => void }) {
  const t = useTranslations("discoveries");
  const format = useFormatter();
  const router = useRouter();
  const toolName = useToolName();
  const [busy, setBusy] = useState(false);

  const action = useMemo(() => actionFor(discovery), [discovery]);
  if (!action) return null;
  // A handoff we cannot reach is not an offer; the tool may not be installed.
  if (isHandoff(action) && !BY_TOOL.has(action.toolId)) return null;

  /** Open a tool with these files already in hand. */
  const handoff = async (fileIds: string[], toolId: string, replaces?: WorkspaceFile) => {
    const entry = BY_TOOL.get(toolId);
    if (!entry) return;
    const handles = (
      await Promise.all(fileIds.map((id) => workspace.openFile(id, toolId)))
    ).filter((handle): handle is File => handle !== null);
    if (handles.length === 0) return;
    // Only a single input can be attributed, so provenance is recorded only then;
    // a wrong lineage would poison the chains learned from it.
    if (fileIds.length === 1) {
      rememberHandoff(
        fileIds[0]!,
        toolId,
        replaces ? { fileId: replaces.id, name: replaces.name } : undefined,
      );
    }
    setPendingFiles(handles);
    router.push(entry.href);
  };

  /** The name a collection should carry, resolved here because it is translated. */
  const collectionName = (name: CollectionName): string =>
    name.from === "stem"
      ? name.stem
      : t("collectionFromSession", {
          when: format.dateTime(new Date(name.startedAt), { day: "numeric", month: "short" }),
        });

  const perform = async () => {
    setBusy(true);
    try {
      switch (action.kind) {
        case "collect": {
          const collection = await workspace.collect(collectionName(action.name), action.fileIds);
          onDone({
            label: t("undone.collected", { name: collection.name }),
            run: () => workspace.uncollect(collection.id),
          });
          break;
        }
        case "archive": {
          const archived = await workspace.archive(action.fileIds);
          // No undo: the bytes are gone. Saying so is the honest report.
          onDone({ label: t("undone.archived", { count: archived.length }) });
          break;
        }
        case "remember-chain": {
          await workspace.saveChain({
            id: workspace.newId(),
            name: defaultChainName(action.steps, toolName),
            steps: action.steps,
            createdAt: Date.now(),
            learned: true,
            appliesTo: action.appliesTo,
          });
          onDone({ label: t("undone.remembered") });
          break;
        }
        case "regenerate":
          await handoff([action.sourceFileId], action.toolId, discoveryResult(discovery));
          break;
        case "apply-tool":
          await handoff(action.fileIds, action.toolId);
          break;
      }
    } finally {
      setBusy(false);
    }
  };

  const label = (() => {
    switch (action.kind) {
      case "collect":
        return t("action.collect");
      case "archive":
        return t("action.archive", { size: formatBytes(action.bytes) });
      case "remember-chain":
        return t("action.rememberChain");
      case "regenerate":
        return t("action.regenerate");
      case "apply-tool":
        return t("action.applyTool", { count: action.fileIds.length });
    }
  })();

  return (
    <div className="mt-1 flex items-center gap-2">
      <Button size="sm" variant="secondary" disabled={busy} onClick={() => void perform()}>
        {label}
      </Button>
      {action.irreversible ? (
        <span className="text-[11px] text-text-muted">{t("action.permanent")}</span>
      ) : null}
    </div>
  );
}

/**
 * What the action did, replacing the button once it has been taken.
 *
 * Stays in the row rather than becoming a toast: a confirmation that floats away
 * after four seconds is not something you can act on, and undo is precisely the
 * thing people reach for a moment too late.
 */
function Receipt({ receipt, onUndone }: { receipt: Undo; onUndone: () => void }) {
  const t = useTranslations("discoveries");
  const [busy, setBusy] = useState(false);

  return (
    <p className="mt-1 flex items-center gap-2 text-xs text-text-muted">
      <Check className="h-3 w-3 shrink-0 text-accent" aria-hidden />
      <span>{receipt.label}</span>
      {receipt.run ? (
        <button
          type="button"
          disabled={busy}
          onClick={() => {
            setBusy(true);
            void receipt
              .run?.()
              .then(onUndone)
              .finally(() => setBusy(false));
          }}
          className="underline underline-offset-2 transition-colors hover:text-text"
        >
          {t("undo")}
        </button>
      ) : null}
    </p>
  );
}

/** The stale output a regeneration replaces, if that is what this discovery is. */
function discoveryResult(discovery: Discovery): WorkspaceFile | undefined {
  return discovery.kind === "superseded-export" ? discovery.result : undefined;
}

/* ---------------------------------------------------------------- helpers */

/** Resolves a tool id to its translated name, falling back to the id. */
function useToolName(): (toolId: string) => string {
  const tRoot = useTranslations();
  return (toolId: string) => {
    const entry = BY_TOOL.get(toolId);
    return entry
      ? tRoot(`${entry.i18nNamespace}.${entry.nameKey}` as Parameters<typeof tRoot>[0])
      : toolId;
  };
}

function minutesBetween(from: number, to: number): number {
  return Math.max(1, Math.round((to - from) / 60_000));
}

function formatBytes(bytes: number): string {
  const units = ["B", "KB", "MB", "GB"];
  let value = bytes;
  let unit = 0;
  while (value >= 1024 && unit < units.length - 1) {
    value /= 1024;
    unit += 1;
  }
  return `${value < 10 && unit > 0 ? value.toFixed(1) : Math.round(value)} ${units[unit]}`;
}
