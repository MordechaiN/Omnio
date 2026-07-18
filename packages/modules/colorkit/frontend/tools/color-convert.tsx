"use client";

import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { Alert, AlertDescription, Input, Label, toast } from "@omnio/ui";
import { parseColor, toHex, toHsl, toRgbString } from "../../shared/color.ts";

/** Color format converter (hex / rgb / hsl) — on your device. */
export default function ColorConvertTool() {
  const t = useTranslations("mod-colorkit");
  const [input, setInput] = useState("#3b82f6");
  const rgb = useMemo(() => parseColor(input), [input]);

  const formats: Array<["hex" | "rgb" | "hsl", string]> = rgb
    ? [
        ["hex", toHex(rgb)],
        ["rgb", toRgbString(rgb)],
        ["hsl", toHsl(rgb)],
      ]
    : [];

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-end gap-3">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="cc-picker">{t("ui.pick")}</Label>
          <input
            id="cc-picker"
            type="color"
            className="h-10 w-16 cursor-pointer rounded-md border border-border bg-transparent"
            value={rgb ? toHex(rgb) : "#000000"}
            onChange={(event) => setInput(event.target.value)}
          />
        </div>
        <div className="flex flex-1 flex-col gap-1.5">
          <Label htmlFor="cc-input">{t("ui.color")}</Label>
          <Input
            id="cc-input"
            dir="ltr"
            className="font-mono"
            value={input}
            onChange={(event) => setInput(event.target.value)}
            placeholder={t("ui.placeholder")}
          />
        </div>
      </div>

      {rgb ? (
        <div className="flex flex-col gap-3">
          <div
            className="h-20 rounded-lg border border-border"
            style={{ backgroundColor: toHex(rgb) }}
            aria-hidden="true"
          />
          <dl className="grid gap-2 sm:grid-cols-3">
            {formats.map(([key, value]) => (
              <button
                key={key}
                type="button"
                className="flex flex-col gap-1 rounded-lg border border-border p-3 text-start hover:border-accent"
                onClick={() => {
                  void navigator.clipboard.writeText(value);
                  toast.success(t("ui.copied"));
                }}
              >
                <dt className="text-sm text-text-muted">{t(`ui.${key}`)}</dt>
                <dd dir="ltr" className="font-mono text-sm">
                  {value}
                </dd>
              </button>
            ))}
          </dl>
        </div>
      ) : (
        <Alert variant="warning">
          <AlertDescription>{t("ui.invalid")}</AlertDescription>
        </Alert>
      )}
    </div>
  );
}
