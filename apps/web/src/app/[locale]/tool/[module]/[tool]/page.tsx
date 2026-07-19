import { notFound } from "next/navigation";
import { setRequestLocale } from "next-intl/server";
import { hasLocale, useTranslations } from "next-intl";
import { use, type ComponentType } from "react";
import type { CategoryId } from "@omnio/core";
import { DynamicIcon, type IconName } from "lucide-react/dynamic";
import { Badge, Icon, ToolShell } from "@omnio/ui";
import { ChevronRight } from "lucide-react";
import { routing } from "@/i18n/routing";
import { Link } from "@/i18n/navigation";
import { TOOL_SURFACES, WEB_TOOLS, type WebToolMeta } from "@/generated/registry.web";
import { RecordRecentTool } from "@/components/workspace/record-recent-tool";
import { RelatedTools } from "@/components/workspace/related-tools";
import { FavoriteButton } from "@/components/workspace/favorite-button";
import { WorkerToolLauncher } from "@/components/jobs/worker-tool-launcher";

export function generateStaticParams() {
  return routing.locales.flatMap((locale) =>
    Object.values(WEB_TOOLS).map((tool) => ({
      locale,
      module: tool.moduleId,
      tool: tool.toolId,
    })),
  );
}

export default function ToolPage({
  params,
}: {
  params: Promise<{ locale: string; module: string; tool: string }>;
}) {
  const { locale, module, tool } = use(params);
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);

  const key = `${module}.${tool}`;
  const meta = WEB_TOOLS[key];
  const Surface = TOOL_SURFACES[key];
  if (!meta || !Surface) notFound();

  return <ToolView meta={meta} Surface={Surface} />;
}

function ToolView({ meta, Surface }: { meta: WebToolMeta; Surface: ComponentType }) {
  const t = useTranslations();
  const name = t(`${meta.i18nNamespace}.tools.${meta.toolId}.name` as Parameters<typeof t>[0]);
  const description = t(
    `${meta.i18nNamespace}.tools.${meta.toolId}.description` as Parameters<typeof t>[0],
  );
  const category = meta.category as CategoryId;

  return (
    <ToolShell
      name={name}
      description={description}
      icon={<DynamicIcon name={meta.icon as IconName} size={24} />}
      badge={
        meta.tier === "browser" ? <Badge variant="accent">{t("common.onDevice")}</Badge> : null
      }
      actions={
        <FavoriteButton
          id={`${meta.moduleId}.${meta.toolId}`}
          className="size-9 opacity-100"
        />
      }
      footer={
        <RelatedTools category={category} excludeId={`${meta.moduleId}.${meta.toolId}`} />
      }
      breadcrumb={
        <nav aria-label={t("shell.breadcrumb")} className="flex items-center gap-1.5">
          <Link href={`/t/${category}`} className="transition-colors hover:text-text">
            {t(`categories.${category}.name`)}
          </Link>
          <Icon icon={ChevronRight} size={16} className="text-text-disabled" />
          <span className="text-text-secondary" aria-current="page">
            {name}
          </span>
        </nav>
      }
    >
      <RecordRecentTool id={`${meta.moduleId}.${meta.toolId}`} />
      {meta.tier === "browser" ? (
        <Surface />
      ) : (
        <WorkerToolLauncher moduleId={meta.moduleId} toolId={meta.toolId} name={name} />
      )}
    </ToolShell>
  );
}
