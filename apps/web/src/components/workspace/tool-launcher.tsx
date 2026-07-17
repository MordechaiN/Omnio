import { useTranslations } from "next-intl";
import { EmptyState } from "@omnio/ui";
import { Wrench } from "lucide-react";
import { SEARCH_ENTRIES } from "@/generated/registry.search";
import { ToolGrid } from "./tool-grid";

/**
 * The workspace centrepiece — the real tools, straight from the registry. This
 * is the first thing that says "workspace, not landing page".
 */
export function ToolLauncher() {
  const t = useTranslations("home");

  return (
    <section className="flex flex-col gap-6" aria-labelledby="tools-title">
      <div className="flex flex-col gap-1.5">
        <h2 id="tools-title" className="text-2xl font-semibold tracking-tight">
          {t("toolsTitle")}
        </h2>
        <p className="text-text-muted">{t("toolsSubtitle")}</p>
      </div>

      {SEARCH_ENTRIES.length === 0 ? (
        <EmptyState icon={Wrench} title={t("toolsEmptyTitle")} description={t("toolsEmptyBody")} />
      ) : (
        <ToolGrid entries={[...SEARCH_ENTRIES]} />
      )}
    </section>
  );
}
