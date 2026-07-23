"use client";

import { useTranslations } from "next-intl";
import { Alert, AlertDescription, AlertTitle } from "@omnio/ui";

/**
 * Server-tier surface. The tool page renders the shared upload → convert →
 * download launcher for worker/server-tier tools; this self-contained note is
 * the fallback (modules can't import the web-app launcher). The conversion runs
 * on the user's own Omnio deployment — no download, no third-party service.
 */
export default function OfficeToPdfTool() {
  const t = useTranslations("mod-officekit");
  return (
    <Alert>
      <AlertTitle>{t("tools.office-to-pdf.name")}</AlertTitle>
      <AlertDescription>{t("ui.o2pNote")}</AlertDescription>
    </Alert>
  );
}
