"use client";

import { useTranslations } from "next-intl";
import { Alert, AlertDescription, AlertTitle } from "@omnio/ui";

/**
 * Worker-tier surface. M4 proves discovery + the worker execution path; the
 * upload → enqueue → progress → download flow lands with the file-action
 * surfaces and jobs tray in M5 (docs/architecture/07-roadmap.md).
 */
export default function UppercaseTool() {
  const t = useTranslations("mod-case");
  return (
    <Alert>
      <AlertTitle>{t("ui.title")}</AlertTitle>
      <AlertDescription>{t("ui.workerNote")}</AlertDescription>
    </Alert>
  );
}
