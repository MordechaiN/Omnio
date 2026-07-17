"use client";

import { useTranslations } from "next-intl";
import { Button, Popover, PopoverContent, PopoverTrigger, Progress, Spinner } from "@omnio/ui";
import { AlertCircle, CheckCircle2, Download, Layers, X } from "lucide-react";
import { fileContentUrl } from "@/lib/api/files";
import { useJobs, type JobPhase, type TrackedJob } from "./jobs-provider";

/** The jobs tray: a top-bar trigger with a live count and a panel of runs. */
export function JobsTray() {
  const t = useTranslations("jobs");
  const { jobs, activeCount, open, setOpen, dismiss, clearFinished } = useJobs();

  if (jobs.length === 0) return null;

  const hasFinished = jobs.some((job) => isTerminal(job.phase));

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-label={t("openTray")}
          className="relative flex size-8 items-center justify-center rounded-full text-text-muted transition-colors duration-(--motion-fast) hover:bg-surface-raised hover:text-text"
        >
          <Layers size={18} />
          {activeCount > 0 ? (
            <span className="absolute -end-0.5 -top-0.5 flex min-w-4 items-center justify-center rounded-full bg-accent px-1 text-[10px] font-semibold leading-4 text-accent-fg">
              {activeCount}
            </span>
          ) : null}
        </button>
      </PopoverTrigger>
      <PopoverContent
        align="end"
        className="w-[min(22rem,calc(100vw-1.5rem))] p-0"
        aria-label={t("title")}
      >
        <header className="flex items-center justify-between border-b border-border-subtle px-4 py-2.5">
          <h2 className="text-sm font-semibold">{t("title")}</h2>
          {hasFinished ? (
            <Button variant="ghost" size="sm" onClick={clearFinished}>
              {t("clearFinished")}
            </Button>
          ) : null}
        </header>
        <ul className="flex max-h-[min(28rem,60vh)] flex-col divide-y divide-border-subtle overflow-y-auto">
          {jobs.map((job) => (
            <li key={job.localId}>
              <JobRow job={job} onDismiss={() => dismiss(job.localId)} />
            </li>
          ))}
        </ul>
      </PopoverContent>
    </Popover>
  );
}

function JobRow({ job, onDismiss }: { job: TrackedJob; onDismiss: () => void }) {
  const t = useTranslations("jobs");
  const terminal = isTerminal(job.phase);

  return (
    <div className="flex flex-col gap-2 px-4 py-3 animate-in fade-in-0 slide-in-from-top-1 duration-(--motion-fast)">
      <div className="flex items-start gap-2.5">
        <PhaseIcon phase={job.phase} />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium">{job.label}</p>
          <p className="truncate text-xs text-text-muted">{job.fileName}</p>
        </div>
        {terminal ? (
          <button
            type="button"
            aria-label={t("dismiss")}
            onClick={onDismiss}
            className="rounded-sm p-0.5 text-text-muted transition-colors duration-(--motion-fast) hover:bg-surface-raised hover:text-text"
          >
            <X size={14} />
          </button>
        ) : null}
      </div>

      {job.phase === "failed" ? (
        <p className="text-xs text-danger">{job.error ?? t("genericError")}</p>
      ) : (
        <div className="flex items-center gap-2">
          <Progress
            value={job.phase === "completed" ? 100 : job.phase === "active" ? job.progress : null}
            aria-label={job.label}
            className="flex-1"
          />
          <span className="w-16 shrink-0 text-end text-xs text-text-muted">
            {t(`phase.${job.phase}`)}
          </span>
        </div>
      )}

      {job.phase === "completed" && job.outputIds.length > 0 ? (
        <div className="flex flex-wrap gap-2">
          {job.outputIds.map((id) => (
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

function PhaseIcon({ phase }: { phase: JobPhase }) {
  if (phase === "completed") {
    return <CheckCircle2 size={18} className="mt-0.5 shrink-0 text-success" />;
  }
  if (phase === "failed" || phase === "canceled") {
    return <AlertCircle size={18} className="mt-0.5 shrink-0 text-danger" />;
  }
  return <Spinner size={16} className="mt-0.5 shrink-0" />;
}

function isTerminal(phase: JobPhase): boolean {
  return phase === "completed" || phase === "failed" || phase === "canceled";
}
