import { notFound } from "next/navigation";
import { setRequestLocale } from "next-intl/server";
import { hasLocale, useTranslations } from "next-intl";
import { use, type ComponentType } from "react";
import { DynamicIcon, type IconName } from "lucide-react/dynamic";
import { Badge, ToolShell } from "@omnio/ui";
import { routing } from "@/i18n/routing";
import { TOOL_SURFACES, WEB_TOOLS, type WebToolMeta } from "@/generated/registry.web";

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

  return (
    <ToolShell
      name={name}
      description={description}
      icon={<DynamicIcon name={meta.icon as IconName} size={24} />}
      badge={
        meta.tier === "browser" ? <Badge variant="accent">{t("common.onDevice")}</Badge> : null
      }
    >
      <Surface />
    </ToolShell>
  );
}
