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
import { useServices, useVersion, type ServiceHealth } from "@/lib/use-version";

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="flex flex-col gap-3">
      <h2 className="text-sm font-semibold text-text-secondary">{title}</h2>
      <dl className="rounded-lg border border-border px-4">{children}</dl>
    </section>
  );
}

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
    <span dir="ltr" className="font-mono text-sm break-all">
      {children}
    </span>
  );
}

const STATUS_VARIANT: Record<ServiceHealth, "success" | "warning" | "danger"> = {
  healthy: "success",
  warning: "warning",
  offline: "danger",
};

export function AboutContent() {
  const t = useTranslations("about");
  const { data, isError } = useVersion();
  const services = useServices();

  // Baked build fields are always available (even if the api is unreachable);
  // the live manifest wins when present.
  const version = data?.version ?? buildInfo.version;
  const commit = data?.commit ?? buildInfo.commit;
  const branch = data?.branch ?? buildInfo.branch;
  const buildNumber = data?.buildNumber ?? buildInfo.buildNumber;
  const buildTimestamp = data?.buildTimestamp ?? buildInfo.buildDate;
  const channel = data?.channel;

  const channelLabel = (c: string): string => {
    const known: Record<string, string> = {
      alpha: t("channel.alpha"),
      beta: t("channel.beta"),
      rc: t("channel.rc"),
      stable: t("channel.stable"),
    };
    return known[c] ?? c;
  };

  const serviceKeys = ["api", "database", "redis", "worker", "storage"] as const;
  const statusLabel = (s: ServiceHealth): string =>
    s === "healthy" ? t("status.healthy") : s === "warning" ? t("status.warning") : t("status.offline");

  return (
    <div className="flex flex-col gap-8">
      <Section title={t("generalSection")}>
        <Row label={t("version")}>
          <span className="flex items-center gap-2">
            <Badge variant="accent">v{version}</Badge>
            {channel ? <Badge variant="neutral">{channelLabel(channel)}</Badge> : null}
          </span>
        </Row>
        <Row label={t("commit")}>
          <Mono>{commit}</Mono>
        </Row>
        <Row label={t("branch")}>
          <Mono>{branch}</Mono>
        </Row>
        <Row label={t("buildNumber")}>
          <Mono>{buildNumber}</Mono>
        </Row>
        <Row label={t("buildDate")}>
          <Mono>{buildTimestamp}</Mono>
        </Row>
      </Section>

      <Section title={t("deploymentSection")}>
        <Row label={t("mode")}>
          {data ? (
            <Badge variant="neutral">{t(data.mode === "personal" ? "modePersonal" : "modeMulti")}</Badge>
          ) : (
            "—"
          )}
        </Row>
        <Row label={t("environment")}>{data ? <Mono>{data.environment}</Mono> : "—"}</Row>
        <Row label={t("host")}>{data?.hostname ? <Mono>{data.hostname}</Mono> : "—"}</Row>
        <Row label={t("dockerImage")}>
          {data?.dockerImages?.length ? (
            <span className="flex flex-col items-end gap-0.5">
              {data.dockerImages.map((image) => (
                <Mono key={image}>{image}</Mono>
              ))}
            </span>
          ) : (
            "—"
          )}
        </Row>
        <Row label={t("platform")}>{data ? <Mono>{data.os}</Mono> : "—"}</Row>
        <Row label={t("architecture")}>{data ? <Mono>{data.arch}</Mono> : "—"}</Row>
      </Section>

      <Section title={t("runtimeSection")}>
        <Row label={t("node")}>{data ? <Mono>{data.node}</Mono> : "—"}</Row>
        <Row label={t("pnpm")}>{data ? <Mono>{data.pnpm}</Mono> : "—"}</Row>
      </Section>

      <Section title={t("servicesSection")}>
        {serviceKeys.map((key) => {
          const status: ServiceHealth = services.data
            ? services.data[key]
            : services.isError
              ? "offline"
              : "warning";
          const isRedis = key === "redis";
          return (
            <Row key={key} label={t(`services.${key}`)}>
              <span className="flex items-center gap-2">
                {isRedis && data?.redis ? <Mono>{data.redis}</Mono> : null}
                <Badge variant={STATUS_VARIANT[status]}>{statusLabel(status)}</Badge>
              </span>
            </Row>
          );
        })}
      </Section>

      <Section title={t("projectSection")}>
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
        <Row label={t("changelog")}>
          <Link href="/changelog" className="text-accent hover:underline">
            {t("viewChangelog")}
          </Link>
        </Row>
        <Row label={t("releaseNotes")}>
          <a
            href={`${OMNIO_REPO_URL}/releases/tag/${versionLabel}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-accent hover:underline"
          >
            {versionLabel} <ExternalLink size={13} aria-hidden />
          </a>
        </Row>
      </Section>

      {isError ? (
        <p className="text-sm text-text-muted">{t("apiOffline")}</p>
      ) : null}
    </div>
  );
}
