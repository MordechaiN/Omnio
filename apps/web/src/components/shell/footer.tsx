"use client";

import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { buildInfo, versionLabel } from "@/lib/build-info";

/**
 * Persistent version badge. Clicking the version opens the About page — the
 * fastest path from "what am I running" to the full build/deployment report.
 */
export function Footer() {
  const t = useTranslations();
  return (
    <footer className="mt-auto border-t border-border-subtle px-4 py-3">
      <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-text-muted">
        <span className="font-semibold text-text-secondary">{t("common.appName")}</span>
        <Link
          href="/about"
          className="rounded-sm font-mono text-text-secondary hover:text-text hover:underline"
          title={t("footer.viewAbout")}
        >
          {versionLabel}
        </Link>
        <span aria-hidden="true">·</span>
        <span className="font-mono">{t("footer.commit", { commit: buildInfo.commit })}</span>
      </div>
    </footer>
  );
}
