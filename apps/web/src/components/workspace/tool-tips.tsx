"use client";

import { useTranslations } from "next-intl";
import { Lightbulb } from "lucide-react";

/**
 * 💡 Optional per-tool tips, read from the module's own catalog
 * (mod-<id>.tools.<tool>.tips.1..3). Renders nothing when a tool has none —
 * tips are written only where they genuinely help, never generated filler.
 */
export function ToolTips({ namespace, toolId }: { namespace: string; toolId: string }) {
  const t = useTranslations();
  const tips: string[] = [];
  for (let i = 1; i <= 3; i += 1) {
    const key = `${namespace}.tools.${toolId}.tips.${i}`;
    if (t.has(key as Parameters<typeof t.has>[0])) {
      tips.push(t(key as Parameters<typeof t>[0]));
    }
  }
  if (tips.length === 0) return null;

  return (
    <aside
      aria-label={t("toolPage.tips")}
      className="flex flex-col gap-2 rounded-xl border border-border-subtle bg-surface p-4"
    >
      <h2 className="flex items-center gap-1.5 text-sm font-semibold text-text-secondary">
        <Lightbulb size={14} aria-hidden="true" />
        {t("toolPage.tips")}
      </h2>
      <ul className="flex list-disc flex-col gap-1 ps-5 text-sm text-text-secondary">
        {tips.map((tip, index) => (
          <li key={index}>{tip}</li>
        ))}
      </ul>
    </aside>
  );
}
