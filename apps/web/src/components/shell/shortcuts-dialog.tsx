"use client";

import { useTranslations } from "next-intl";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  Kbd,
} from "@omnio/ui";

const ROWS: Array<{ keys: string[]; labelKey: string }> = [
  { keys: ["⌘", "K"], labelKey: "openPalette" },
  { keys: ["/"], labelKey: "openPaletteAlt" },
  { keys: ["↑", "↓"], labelKey: "navigate" },
  { keys: ["↵"], labelKey: "select" },
  { keys: ["Esc"], labelKey: "close" },
  { keys: ["Tab"], labelKey: "moveFocus" },
];

/** ⌨️ The keyboard reference — every global shortcut in one quiet card. */
export function ShortcutsDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const t = useTranslations("shortcuts");
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>{t("title")}</DialogTitle>
        </DialogHeader>
        <dl className="flex flex-col divide-y divide-border-subtle">
          {ROWS.map((row) => (
            <div key={row.labelKey} className="flex items-center justify-between gap-4 py-2.5">
              <dt className="text-sm text-text-secondary">
                {t(row.labelKey as Parameters<typeof t>[0])}
              </dt>
              <dd className="flex items-center gap-1">
                {row.keys.map((key) => (
                  <Kbd key={key}>{key}</Kbd>
                ))}
              </dd>
            </div>
          ))}
        </dl>
        <p className="text-sm text-text-muted">{t("hint")}</p>
      </DialogContent>
    </Dialog>
  );
}
