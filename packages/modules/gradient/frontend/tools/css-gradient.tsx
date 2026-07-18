"use client";

import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { Button, Input, Label, Select, SelectContent, SelectItem, SelectTrigger, SelectValue, toast } from "@omnio/ui";
import { buildGradient, gradientCss, type ColorStop, type GradientType } from "../../shared/gradient.ts";

/** CSS gradient builder with live preview — on your device. */
export default function CssGradientTool() {
  const t = useTranslations("mod-gradient");
  const [type, setType] = useState<GradientType>("linear");
  const [angle, setAngle] = useState(90);
  const [stops, setStops] = useState<ColorStop[]>([
    { color: "#3b82f6" },
    { color: "#8b5cf6" },
  ]);

  const value = useMemo(() => buildGradient(type, angle, stops), [type, angle, stops]);

  function setStop(index: number, color: string): void {
    setStops((prev) => prev.map((s, i) => (i === index ? { ...s, color } : s)));
  }
  function addStop(): void {
    setStops((prev) => [...prev, { color: "#ffffff" }]);
  }
  function removeStop(index: number): void {
    setStops((prev) => (prev.length > 2 ? prev.filter((_, i) => i !== index) : prev));
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="h-40 rounded-lg border border-border" style={{ background: value }} aria-hidden="true" />

      <div className="flex flex-wrap items-end gap-4">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="gr-type">{t("ui.type")}</Label>
          <Select value={type} onValueChange={(v) => setType(v as GradientType)}>
            <SelectTrigger id="gr-type" className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="linear">{t("ui.linear")}</SelectItem>
              <SelectItem value="radial">{t("ui.radial")}</SelectItem>
            </SelectContent>
          </Select>
        </div>
        {type === "linear" ? (
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="gr-angle">{t("ui.angle")}</Label>
            <Input
              id="gr-angle"
              type="number"
              className="w-28"
              value={angle}
              onChange={(event) => setAngle(Number(event.target.value))}
            />
          </div>
        ) : null}
      </div>

      <div className="flex flex-col gap-2">
        <Label>{t("ui.stops")}</Label>
        {stops.map((stop, index) => (
          <div key={index} className="flex items-center gap-2">
            <input
              type="color"
              className="h-10 w-12 shrink-0 cursor-pointer rounded-md border border-border bg-transparent"
              value={stop.color}
              onChange={(event) => setStop(index, event.target.value)}
              aria-label={`${t("ui.stop")} ${index + 1}`}
            />
            <Input dir="ltr" className="font-mono" value={stop.color} onChange={(e) => setStop(index, e.target.value)} />
            <Button
              type="button"
              size="sm"
              variant="ghost"
              disabled={stops.length <= 2}
              onClick={() => removeStop(index)}
            >
              {t("ui.remove")}
            </Button>
          </div>
        ))}
        <div>
          <Button type="button" size="sm" variant="secondary" onClick={addStop}>
            {t("ui.addStop")}
          </Button>
        </div>
      </div>

      <div className="flex items-center justify-between gap-2 rounded-lg border border-border p-3">
        <code dir="ltr" className="truncate font-mono text-sm">
          {gradientCss(value)}
        </code>
        <Button
          type="button"
          size="sm"
          variant="ghost"
          onClick={() => {
            void navigator.clipboard.writeText(gradientCss(value));
            toast.success(t("ui.copied"));
          }}
        >
          {t("ui.copy")}
        </Button>
      </div>
    </div>
  );
}
