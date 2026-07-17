"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { toast } from "@omnio/ui";
import { apiClient } from "@/lib/api/client";
import { uploadFile } from "@/lib/api/files";
import { createJob, jobEventsUrl } from "@/lib/api/jobs";

export type JobPhase = "uploading" | "queued" | "active" | "completed" | "failed" | "canceled";

export interface TrackedJob {
  localId: string;
  moduleId: string;
  toolId: string;
  label: string;
  fileName: string;
  phase: JobPhase;
  progress: number;
  jobId: string | null;
  outputIds: string[];
  error: string | null;
  createdAt: number;
}

export interface RunJobInput {
  moduleId: string;
  toolId: string;
  /** Human-readable tool name, shown in the tray. */
  label: string;
  file: File;
}

interface JobsContextValue {
  jobs: TrackedJob[];
  activeCount: number;
  open: boolean;
  setOpen: (open: boolean) => void;
  runJob: (input: RunJobInput) => void;
  dismiss: (localId: string) => void;
  clearFinished: () => void;
}

const ACTIVE_PHASES: ReadonlySet<JobPhase> = new Set(["uploading", "queued", "active"]);
const TERMINAL_PHASES: ReadonlySet<JobPhase> = new Set(["completed", "failed", "canceled"]);

const JobsContext = createContext<JobsContextValue | null>(null);

export function useJobs(): JobsContextValue {
  const value = useContext(JobsContext);
  if (!value) throw new Error("useJobs must be used within <JobsProvider>.");
  return value;
}

/**
 * The client-side job runtime: uploads the input, enqueues the job, then relays
 * live progress from the api's SSE stream into a tray the whole app can see. One
 * tracked entry per run, from "uploading" through a terminal state.
 */
export function JobsProvider({ children }: { children: React.ReactNode }) {
  const t = useTranslations("jobs");
  const [jobs, setJobs] = useState<TrackedJob[]>([]);
  const [open, setOpen] = useState(false);
  const sources = useRef(new Map<string, EventSource>());

  const patch = useCallback((localId: string, next: Partial<TrackedJob>) => {
    setJobs((current) =>
      current.map((job) => (job.localId === localId ? { ...job, ...next } : job)),
    );
  }, []);

  const closeSource = useCallback((localId: string) => {
    const source = sources.current.get(localId);
    if (source) {
      source.close();
      sources.current.delete(localId);
    }
  }, []);

  // Tear down any open streams when the app unmounts.
  useEffect(() => {
    const map = sources.current;
    return () => {
      for (const source of map.values()) source.close();
      map.clear();
    };
  }, []);

  const track = useCallback(
    (localId: string, jobId: string, label: string) => {
      const source = new EventSource(jobEventsUrl(jobId), { withCredentials: true });
      sources.current.set(localId, source);

      source.onmessage = (event) => {
        const data = safeParse(event.data);
        if (!data) return;
        patch(localId, { phase: data.status, progress: data.progress, error: data.error });

        if (TERMINAL_PHASES.has(data.status)) {
          closeSource(localId);
          if (data.status === "completed") {
            void finalize(localId, jobId);
            toast.success(t("doneToast", { label }));
          } else if (data.status === "failed") {
            toast.error(t("failedToast", { label }));
          }
        }
      };

      source.onerror = () => {
        // The stream ends itself on a terminal status; only surface a genuine drop.
        if (source.readyState === EventSource.CLOSED) return;
        closeSource(localId);
        patch(localId, { phase: "failed", error: t("connectionLost") });
      };
    },
    [closeSource, patch, t],
  );

  const finalize = useCallback(
    async (localId: string, jobId: string) => {
      const res = await apiClient.jobs.get({ params: { id: jobId } });
      if (res.status === 200) patch(localId, { outputIds: res.body.outputs });
    },
    [patch],
  );

  const runJob = useCallback(
    (input: RunJobInput) => {
      const localId = crypto.randomUUID();
      setJobs((current) => [
        {
          localId,
          moduleId: input.moduleId,
          toolId: input.toolId,
          label: input.label,
          fileName: input.file.name,
          phase: "uploading",
          progress: 0,
          jobId: null,
          outputIds: [],
          error: null,
          createdAt: Date.now(),
        },
        ...current,
      ]);
      setOpen(true);

      void (async () => {
        try {
          const uploaded = await uploadFile(input.file);
          patch(localId, { phase: "queued" });
          const job = await createJob({
            moduleId: input.moduleId,
            toolId: input.toolId,
            inputFileIds: [uploaded.id],
          });
          patch(localId, { jobId: job.id, phase: job.status, progress: job.progress });
          if (TERMINAL_PHASES.has(job.status)) {
            if (job.status === "completed") patch(localId, { outputIds: job.outputs });
            return;
          }
          track(localId, job.id, input.label);
        } catch (error) {
          patch(localId, {
            phase: "failed",
            error: error instanceof Error ? error.message : t("genericError"),
          });
          toast.error(t("failedToast", { label: input.label }));
        }
      })();
    },
    [patch, t, track],
  );

  const dismiss = useCallback(
    (localId: string) => {
      closeSource(localId);
      setJobs((current) => current.filter((job) => job.localId !== localId));
    },
    [closeSource],
  );

  const clearFinished = useCallback(() => {
    setJobs((current) => {
      for (const job of current) {
        if (TERMINAL_PHASES.has(job.phase)) closeSource(job.localId);
      }
      return current.filter((job) => !TERMINAL_PHASES.has(job.phase));
    });
  }, [closeSource]);

  const activeCount = jobs.filter((job) => ACTIVE_PHASES.has(job.phase)).length;

  return (
    <JobsContext.Provider
      value={{ jobs, activeCount, open, setOpen, runJob, dismiss, clearFinished }}
    >
      {children}
    </JobsContext.Provider>
  );
}

interface ProgressMessage {
  status: JobPhase;
  progress: number;
  error: string | null;
}

function safeParse(payload: string): ProgressMessage | null {
  try {
    const value = JSON.parse(payload) as Partial<ProgressMessage>;
    if (typeof value.status !== "string" || typeof value.progress !== "number") return null;
    return {
      status: value.status as JobPhase,
      progress: value.progress,
      error: value.error ?? null,
    };
  } catch {
    return null;
  }
}
