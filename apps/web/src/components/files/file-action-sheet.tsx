"use client";

import { useTranslations } from "next-intl";
import { Badge, Button, Dialog, DialogContent, DialogHeader, DialogTitle } from "@omnio/ui";
import { DynamicIcon, type IconName } from "lucide-react/dynamic";
import { Eye, Play } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { SEARCH_ENTRIES, type SearchEntry } from "@/generated/registry.search";
import capabilities from "@/generated/capabilities.json";
import { detectMime, formatBytes } from "@/lib/file-kind";
import { useJobs } from "@/components/jobs/jobs-provider";

interface CapabilityAction {
  moduleId: string;
  toolId: string;
  verb: string;
  rank: number;
}

const BY_ID = new Map(SEARCH_ENTRIES.map((entry) => [entry.id, entry]));
const BY_MIME = (capabilities as { byMime: Record<string, CapabilityAction[]> }).byMime;

function ActionIcon({ icon }: { icon: string }) {
  return (
    <span className="flex size-7 items-center justify-center rounded-md bg-accent-subtle text-accent-subtle-fg">
      <DynamicIcon name={icon as IconName} size={15} />
    </span>
  );
}

function actionsFor(mime: string): SearchEntry[] {
  return (BY_MIME[mime] ?? [])
    .map((action) => BY_ID.get(`${action.moduleId}.${action.toolId}`))
    .filter((entry): entry is SearchEntry => entry !== undefined);
}

/**
 * The "drop a file" action sheet — View first (the universal viewer), then any
 * tool that declares it can handle this file type, read from capabilities.json.
 */
export function FileActionSheet({
  file,
  onView,
  onClose,
}: {
  file: File | null;
  onView: () => void;
  onClose: () => void;
}) {
  const t = useTranslations("files");
  const tRoot = useTranslations();
  const { runJob } = useJobs();

  const actions = file ? actionsFor(detectMime(file)) : [];

  function nameOf(entry: SearchEntry): string {
    return tRoot(
      `${entry.i18nNamespace}.tools.${entry.toolId}.name` as Parameters<typeof tRoot>[0],
    );
  }

  return (
    <Dialog open={file !== null} onOpenChange={(open) => !open && onClose()}>
      <DialogContent size="sm" closeLabel={t("close")}>
        {file ? (
          <>
            <DialogHeader>
              <DialogTitle className="truncate">{file.name}</DialogTitle>
              <p className="text-sm text-text-muted">
                {file.type || t("unknownType")} · {formatBytes(file.size)}
              </p>
            </DialogHeader>

            <div className="flex flex-col gap-2">
              <Button onClick={onView} className="justify-start gap-2.5">
                <Eye size={16} />
                {t("view")}
              </Button>

              {actions.map((entry) =>
                entry.tier === "browser" ? (
                  <Link
                    key={entry.id}
                    href={entry.href}
                    onClick={onClose}
                    className="flex items-center gap-2.5 rounded-md border border-border-subtle bg-surface px-3 py-2.5 text-sm transition-colors duration-(--motion-fast) hover:border-border hover:bg-surface-raised"
                  >
                    <ActionIcon icon={entry.icon} />
                    <span className="flex-1">{nameOf(entry)}</span>
                    <Badge variant="accent">{tRoot("common.onDevice")}</Badge>
                  </Link>
                ) : (
                  <button
                    key={entry.id}
                    type="button"
                    onClick={() => {
                      if (!file) return;
                      runJob({
                        moduleId: entry.moduleId,
                        toolId: entry.toolId,
                        label: nameOf(entry),
                        file,
                      });
                      onClose();
                    }}
                    className="flex items-center gap-2.5 rounded-md border border-border-subtle bg-surface px-3 py-2.5 text-start text-sm transition-colors duration-(--motion-fast) hover:border-border hover:bg-surface-raised"
                  >
                    <ActionIcon icon={entry.icon} />
                    <span className="flex-1">{nameOf(entry)}</span>
                    <Play size={14} className="text-text-muted" />
                  </button>
                ),
              )}
            </div>
          </>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
