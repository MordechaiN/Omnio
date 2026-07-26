"use client";

import { useRef } from "react";
import { useTranslations } from "next-intl";
import { Button, EmptyState } from "@omnio/ui";
import { CloudOff, UploadCloud } from "lucide-react";
import { useServerReachability } from "@/components/auth/server-reachability";
import { useJobs } from "./jobs-provider";

/**
 * The worker/server-tier tool surface: pick a file, and the run streams into the
 * Activity tray (upload → process → download). Browser-tier tools ship their own
 * on-device UI instead; this is the uploaded-file path.
 */
export function WorkerToolLauncher({
  moduleId,
  toolId,
  name,
}: {
  moduleId: string;
  toolId: string;
  name: string;
}) {
  const t = useTranslations("jobs");
  const input = useRef<HTMLInputElement>(null);
  const { runJob } = useJobs();
  const { online } = useServerReachability();

  // This is one of the few tools that genuinely needs the server. Offering an
  // upload button that could only fail would be worse than saying so plainly.
  if (!online) {
    return (
      <EmptyState icon={CloudOff} title={t("needsServerTitle")} description={t("needsServerBody")} />
    );
  }

  function onPick(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (file) runJob({ moduleId, toolId, label: name, file });
  }

  return (
    <div className="flex flex-col items-center gap-4 rounded-xl border border-dashed border-border px-6 py-12 text-center">
      <span className="flex size-12 items-center justify-center rounded-full bg-accent-subtle text-accent-subtle-fg">
        <UploadCloud size={24} />
      </span>
      <div className="flex flex-col gap-1">
        <p className="text-sm font-medium">{t("launcherTitle")}</p>
        <p className="text-sm text-text-muted">{t("launcherSubtitle")}</p>
      </div>
      <input
        ref={input}
        type="file"
        aria-label={t("chooseFile")}
        className="sr-only"
        onChange={onPick}
      />
      <Button onClick={() => input.current?.click()}>{t("chooseFile")}</Button>
    </div>
  );
}
