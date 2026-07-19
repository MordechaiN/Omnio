"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Input, Label } from "@omnio/ui";
import { simplifyRatio } from "../../shared/transform.ts";

/**
 * Aspect ratio calculator — simplify a resolution to its ratio, and solve the
 * missing side when scaling to a new width or height.
 */
export default function AspectRatioTool() {
  const t = useTranslations("mod-imagekit");
  const [width, setWidth] = useState("1920");
  const [height, setHeight] = useState("1080");
  const [targetWidth, setTargetWidth] = useState("1280");

  const w = Number(width);
  const h = Number(height);
  const tw = Number(targetWidth);
  const valid = Number.isFinite(w) && Number.isFinite(h) && w > 0 && h > 0;
  const [ratioW, ratioH] = valid ? simplifyRatio(w, h) : [0, 0];
  const solvedHeight = valid && Number.isFinite(tw) && tw > 0 ? Math.round((tw * h) / w) : null;

  return (
    <div className="flex flex-col gap-6">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="ar-width">{t("ui.width")}</Label>
          <Input
            id="ar-width"
            dir="ltr"
            type="number"
            inputMode="numeric"
            min={1}
            value={width}
            onChange={(event) => setWidth(event.target.value)}
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="ar-height">{t("ui.height")}</Label>
          <Input
            id="ar-height"
            dir="ltr"
            type="number"
            inputMode="numeric"
            min={1}
            value={height}
            onChange={(event) => setHeight(event.target.value)}
          />
        </div>
      </div>

      {valid ? (
        <div aria-live="polite" className="flex flex-col gap-1 rounded-xl border border-border-subtle bg-surface p-4">
          <p className="text-sm text-text-muted">{t("ui.ratioLabel")}</p>
          <p dir="ltr" className="text-start text-2xl font-semibold tabular-nums">
            {ratioW}:{ratioH}
          </p>
        </div>
      ) : (
        <p role="alert" className="text-sm text-danger">
          {t("ui.ratioInvalid")}
        </p>
      )}

      <div className="flex flex-col gap-3 rounded-xl border border-border-subtle bg-surface p-4">
        <p className="text-sm font-medium">{t("ui.solveTitle")}</p>
        <div className="flex flex-wrap items-end gap-3">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="ar-target">{t("ui.solveWidth")}</Label>
            <Input
              id="ar-target"
              dir="ltr"
              type="number"
              inputMode="numeric"
              min={1}
              className="w-36"
              value={targetWidth}
              onChange={(event) => setTargetWidth(event.target.value)}
            />
          </div>
          {solvedHeight !== null ? (
            <p aria-live="polite" className="pb-2 text-sm">
              {t("ui.solveResult", { height: solvedHeight })}
            </p>
          ) : null}
        </div>
      </div>
    </div>
  );
}
