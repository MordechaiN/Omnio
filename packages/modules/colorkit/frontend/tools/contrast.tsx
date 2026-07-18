"use client";

import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { Alert, AlertDescription, Badge, Input, Label } from "@omnio/ui";
import { parseColor, toHex, wcagVerdict } from "../../shared/color.ts";

/** WCAG contrast checker — on your device. */
export default function ContrastTool() {
  const t = useTranslations("mod-colorkit");
  const [fg, setFg] = useState("#1f2937");
  const [bg, setBg] = useState("#ffffff");

  const fgRgb = useMemo(() => parseColor(fg), [fg]);
  const bgRgb = useMemo(() => parseColor(bg), [bg]);
  const verdict = fgRgb && bgRgb ? wcagVerdict(fgRgb, bgRgb) : null;

  const checks: Array<["aaNormal" | "aaLarge" | "aaaNormal" | "aaaLarge", boolean]> = verdict
    ? [
        ["aaNormal", verdict.aaNormal],
        ["aaLarge", verdict.aaLarge],
        ["aaaNormal", verdict.aaaNormal],
        ["aaaLarge", verdict.aaaLarge],
      ]
    : [];

  return (
    <div className="flex flex-col gap-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="ct-fg">{t("ui.foreground")}</Label>
          <div className="flex items-center gap-2">
            <input
              type="color"
              className="h-10 w-12 shrink-0 cursor-pointer rounded-md border border-border bg-transparent"
              value={fgRgb ? toHex(fgRgb) : "#000000"}
              onChange={(event) => setFg(event.target.value)}
              aria-label={t("ui.foreground")}
            />
            <Input id="ct-fg" dir="ltr" className="font-mono" value={fg} onChange={(e) => setFg(e.target.value)} />
          </div>
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="ct-bg">{t("ui.background")}</Label>
          <div className="flex items-center gap-2">
            <input
              type="color"
              className="h-10 w-12 shrink-0 cursor-pointer rounded-md border border-border bg-transparent"
              value={bgRgb ? toHex(bgRgb) : "#ffffff"}
              onChange={(event) => setBg(event.target.value)}
              aria-label={t("ui.background")}
            />
            <Input id="ct-bg" dir="ltr" className="font-mono" value={bg} onChange={(e) => setBg(e.target.value)} />
          </div>
        </div>
      </div>

      {verdict ? (
        <div className="flex flex-col gap-4">
          <div
            className="flex items-center justify-center rounded-lg border border-border p-8 text-lg font-semibold"
            style={{ color: toHex(fgRgb!), backgroundColor: toHex(bgRgb!) }}
          >
            {t("ui.sample")}
          </div>
          <p className="text-2xl font-bold tabular-nums">
            {verdict.ratio}:1 <span className="text-sm font-normal text-text-muted">{t("ui.ratio")}</span>
          </p>
          <dl className="grid gap-2 sm:grid-cols-2">
            {checks.map(([key, pass]) => (
              <div key={key} className="flex items-center justify-between rounded-lg border border-border p-3">
                <dt className="text-sm">{t(`ui.${key}`)}</dt>
                <dd>
                  <Badge variant={pass ? "success" : "danger"}>
                    {pass ? t("ui.pass") : t("ui.fail")}
                  </Badge>
                </dd>
              </div>
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
