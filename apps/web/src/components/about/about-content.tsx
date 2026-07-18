"use client";

import { useTranslations } from "next-intl";
import { Badge } from "@omnio/ui";
import { ExternalLink } from "lucide-react";
import { Link } from "@/i18n/navigation";
import {
  buildInfo,
  OMNIO_DOCS_URL,
  OMNIO_LICENSE,
  OMNIO_REPO_URL,
  versionLabel,
} from "@/lib/build-info";
import { useVersion } from "@/lib/use-version";

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1 border-b border-border-subtle py-3 last:border-0 sm:flex-row sm:items-center sm:justify-between">
      <dt className="text-sm text-text-muted">{label}</dt>
      <dd className="text-sm font-medium">{children}</dd>
    </div>
  );
}

function Mono({ children }: { children: React.ReactNode }) {
  return (
    <span dir="ltr" className="font-mono text-sm">
      {children}
    </span>
  );
}

export function AboutContent() {
  const t = useTranslations("about");
  const { data, isPending, isError } = useVersion();

  // Build status: the running api agrees with the bundle it was shipped with.
  const buildStatus = isPending
    ? { variant: "neutral" as const, label: t("checking") }
    : isError
      ? { variant: "danger" as const, label: t("unreachable") }
      : data && data.commit === buildInfo.commit
        ? { variant: "success" as const, label: t("operational") }
        : { variant: "warning" as const, label: t("mismatch") };

  const mode = data?.mode;
  const environment = data?.environment;

  return (
    <div className="flex flex-col gap-8">
      <section className="flex flex-col gap-4">
        <h2 className="text-sm font-semibold text-text-secondary">{t("buildSection")}</h2>
        <dl className="rounded-lg border border-border px-4">
          <Row label={t("version")}>
            <Badge variant="accent">{versionLabel}</Badge>
          </Row>
          <Row label={t("commit")}>
            <Mono>{buildInfo.commit}</Mono>
          </Row>
          <Row label={t("branch")}>
            <Mono>{buildInfo.branch}</Mono>
          </Row>
          <Row label={t("buildDate")}>
            <Mono>{buildInfo.buildDate}</Mono>
          </Row>
          <Row label={t("buildNumber")}>
            <Mono>{buildInfo.buildNumber}</Mono>
          </Row>
        </dl>
      </section>

      <section className="flex flex-col gap-4">
        <h2 className="text-sm font-semibold text-text-secondary">{t("deploymentSection")}</h2>
        <dl className="rounded-lg border border-border px-4">
          <Row label={t("mode")}>
            {mode ? <Badge variant="neutral">{t(mode === "personal" ? "modePersonal" : "modeMulti")}</Badge> : "—"}
          </Row>
          <Row label={t("environment")}>{environment ? <Mono>{environment}</Mono> : "—"}</Row>
          <Row label={t("buildStatus")}>
            <Badge variant={buildStatus.variant}>{buildStatus.label}</Badge>
          </Row>
        </dl>
      </section>

      <section className="flex flex-col gap-4">
        <h2 className="text-sm font-semibold text-text-secondary">{t("resourcesSection")}</h2>
        <dl className="rounded-lg border border-border px-4">
          <Row label={t("license")}>
            <Mono>{OMNIO_LICENSE}</Mono>
          </Row>
          <Row label={t("repository")}>
            <a
              href={OMNIO_REPO_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-accent hover:underline"
            >
              GitHub <ExternalLink size={13} aria-hidden />
            </a>
          </Row>
          <Row label={t("documentation")}>
            <a
              href={OMNIO_DOCS_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-accent hover:underline"
            >
              docs <ExternalLink size={13} aria-hidden />
            </a>
          </Row>
          <Row label={t("releaseNotes")}>
            <Link href="/changelog" className="text-accent hover:underline">
              {t("viewChangelog")}
            </Link>
          </Row>
        </dl>
      </section>
    </div>
  );
}
