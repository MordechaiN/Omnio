"use client";

import { useFormatter, useTranslations } from "next-intl";
import type { JobDto, JobStatus } from "@omnio/contracts";
import {
  Alert,
  AlertDescription,
  Badge,
  Button,
  type BadgeProps,
  EmptyState,
  Skeleton,
} from "@omnio/ui";
import { DynamicIcon, type IconName } from "lucide-react/dynamic";
import { Download, History } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { SEARCH_ENTRIES } from "@/generated/registry.search";
import { fileContentUrl } from "@/lib/api/files";
import { useJobsList } from "@/lib/api/jobs";

const BY_ID = new Map(SEARCH_ENTRIES.map((entry) => [entry.id, entry]));

const STATUS_VARIANT: Record<JobStatus, NonNullable<BadgeProps["variant"]>> = {
  queued: "neutral",
  active: "accent",
  completed: "success",
  failed: "danger",
  canceled: "neutral",
};

/** The run history: every job the account has enqueued, newest first. */
export function HistoryView() {
  const t = useTranslations("history");
  const jobs = useJobsList();

  if (jobs.isPending) {
    return (
      <div className="flex flex-col gap-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-20 w-full rounded-lg" />
        ))}
      </div>
    );
  }

  if (jobs.isError) {
    return (
      <Alert variant="danger">
        <AlertDescription className="flex items-center justify-between gap-4">
          {t("error")}
          <Button
            variant="secondary"
            size="sm"
            onClick={() => void jobs.refetch()}
            disabled={jobs.isFetching}
          >
            {t("retry")}
          </Button>
        </AlertDescription>
      </Alert>
    );
  }

  if (jobs.data.length === 0) {
    return (
      <EmptyState
        icon={History}
        title={t("emptyTitle")}
        description={t("emptyBody")}
        action={
          <Button asChild>
            <Link href="/">{t("emptyAction")}</Link>
          </Button>
        }
      />
    );
  }

  return (
    <ul className="flex flex-col gap-3">
      {jobs.data.map((job) => (
        <li key={job.id}>
          <JobHistoryRow job={job} />
        </li>
      ))}
    </ul>
  );
}

function JobHistoryRow({ job }: { job: JobDto }) {
  const t = useTranslations("jobs");
  const tRoot = useTranslations();
  const format = useFormatter();

  const entry = BY_ID.get(`${job.moduleId}.${job.toolId}`);
  const name = entry
    ? tRoot(`${entry.i18nNamespace}.tools.${entry.toolId}.name` as Parameters<typeof tRoot>[0])
    : `${job.moduleId}.${job.toolId}`;

  return (
    <div className="flex flex-col gap-3 rounded-lg border border-border-subtle bg-surface p-4">
      <div className="flex items-start gap-3">
        <span className="flex size-9 shrink-0 items-center justify-center rounded-md bg-accent-subtle text-accent-subtle-fg">
          <DynamicIcon name={(entry?.icon ?? "file") as IconName} size={18} />
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium">{name}</p>
          <p className="text-xs text-text-muted">
            {format.dateTime(new Date(job.createdAt), { dateStyle: "medium", timeStyle: "short" })}
          </p>
        </div>
        <Badge variant={STATUS_VARIANT[job.status]}>{t(`phase.${job.status}`)}</Badge>
      </div>

      {job.status === "failed" && job.error ? (
        <p className="text-xs text-danger">{job.error}</p>
      ) : null}

      {job.outputs.length > 0 ? (
        <div className="flex flex-wrap gap-2">
          {job.outputs.map((id) => (
            <a
              key={id}
              href={fileContentUrl(id)}
              download
              className="inline-flex items-center gap-1.5 rounded-md bg-accent-subtle px-2.5 py-1 text-xs font-medium text-accent-subtle-fg transition-colors duration-(--motion-fast) hover:bg-accent-subtle/80"
            >
              <Download size={13} />
              {t("download")}
            </a>
          ))}
        </div>
      ) : null}
    </div>
  );
}
