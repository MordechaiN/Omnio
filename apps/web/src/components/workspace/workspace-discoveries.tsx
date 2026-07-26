"use client";

import { useMemo } from "react";
import { useFormatter, useTranslations } from "next-intl";
import { setPendingFiles } from "@omnio/module-sdk";
import { discover, workspace, type Discovery } from "@omnio/workspace";
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
  Clock,
  Files as FilesIcon,
  Footprints,
  Image as ImageIcon,
  MoreHorizontal,
  Repeat,
  RefreshCw,
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
export function WorkspaceDiscoveries() {
  const t = useTranslations("discoveries");
  const { files, events, dismissed, ready } = useWorkspace();

  const discoveries = useMemo(
    () => (ready ? discover(files, events, { dismissed }) : []),
    [files, events, dismissed, ready],
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
            <DiscoveryRow discovery={discovery} />
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
function DiscoveryRow({ discovery }: { discovery: Discovery }) {
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
        <Action discovery={discovery} />
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
 * The next move, where there genuinely is one.
 *
 * Only two discoveries carry an action, because only two have a single obvious
 * thing to do. Inventing a button for the others would turn observations into a
 * list of chores.
 */
function Action({ discovery }: { discovery: Discovery }) {
  const t = useTranslations("discoveries");
  const router = useRouter();
  const toolName = useToolName();

  const handoff = async (fileIds: string[], toolId: string) => {
    const entry = BY_TOOL.get(toolId);
    if (!entry) return;
    const handles = (
      await Promise.all(fileIds.map((id) => workspace.openFile(id, toolId)))
    ).filter((handle): handle is File => handle !== null);
    if (handles.length === 0) return;
    // Only a single input can be attributed, so provenance is recorded only then;
    // a wrong lineage would poison the chains learned from it.
    if (fileIds.length === 1) rememberHandoff(fileIds[0]!, toolId);
    setPendingFiles(handles);
    router.push(entry.href);
  };

  if (discovery.kind === "superseded-export" && BY_TOOL.has(discovery.toolId)) {
    return (
      <Button
        size="sm"
        variant="secondary"
        className="mt-1 self-start"
        onClick={() => void handoff([discovery.replacement.id], discovery.toolId)}
      >
        {t("supersededExport.action", { tool: toolName(discovery.toolId) })}
      </Button>
    );
  }

  if (discovery.kind === "habit" && BY_TOOL.has(discovery.toolId)) {
    return (
      <Button
        size="sm"
        variant="secondary"
        className="mt-1 self-start"
        onClick={() => void handoff(discovery.pending.map((file) => file.id), discovery.toolId)}
      >
        {t("habit.action", { count: discovery.pending.length })}
      </Button>
    );
  }

  return null;
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
