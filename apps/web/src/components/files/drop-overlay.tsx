"use client";

import { useTranslations } from "next-intl";
import { Icon } from "@omnio/ui";
import { UploadCloud } from "lucide-react";

/** The full-window affordance shown while a file is dragged over the app. */
export function DropOverlay() {
  const t = useTranslations("files");
  return (
    <div className="fixed inset-0 z-(--z-modal) flex items-center justify-center bg-backdrop/80 p-6 backdrop-blur-(--blur-backdrop)">
      <div className="pointer-events-none flex flex-col items-center gap-4 rounded-2xl border-2 border-dashed border-accent bg-overlay px-12 py-16 text-center shadow-2">
        <span className="flex size-14 items-center justify-center rounded-full bg-accent-subtle text-accent-subtle-fg">
          <Icon icon={UploadCloud} size={24} />
        </span>
        <div className="flex flex-col gap-1">
          <p className="text-lg font-semibold">{t("dropTitle")}</p>
          <p className="text-sm text-text-muted">{t("dropSubtitle")}</p>
        </div>
      </div>
    </div>
  );
}
