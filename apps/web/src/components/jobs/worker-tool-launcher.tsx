"use client";

import { useRef } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@omnio/ui";
import { UploadCloud } from "lucide-react";
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
