"use client";

import { useTranslations } from "next-intl";
import { Button } from "@omnio/ui";
import { Link } from "@/i18n/navigation";

/**
 * When a screen fails to render, the first question anyone asks is "are my files
 * gone?". The answer is no — they are on this device, and a broken screen cannot
 * touch them — so the message says that before anything else.
 *
 * The error itself is deliberately not shown: it means nothing to the person
 * reading it. `reset()` re-renders the segment, which is genuinely worth trying
 * before reaching for the browser's reload button.
 */
export default function ErrorScreen({ reset }: { error: Error; reset: () => void }) {
  const t = useTranslations("errors.crash");
  return (
    <div className="mx-auto flex max-w-lg flex-col items-start gap-4 px-4 py-16 sm:px-6">
      <h1 className="text-2xl font-semibold tracking-tight">{t("title")}</h1>
      <p className="text-sm text-text-muted">{t("body")}</p>
      <div className="mt-2 flex flex-wrap gap-2">
        <Button onClick={reset}>{t("retry")}</Button>
        <Button asChild variant="secondary">
          <Link href="/">{t("home")}</Link>
        </Button>
      </div>
    </div>
  );
}
