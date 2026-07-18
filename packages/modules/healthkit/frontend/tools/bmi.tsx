"use client";

import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { Alert, AlertDescription, Badge, Button, Input, Label } from "@omnio/ui";
import { bmiImperial, bmiMetric } from "../../shared/bmi.ts";

type System = "metric" | "imperial";

const CATEGORY_VARIANT = {
  underweight: "info",
  normal: "success",
  overweight: "warning",
  obese: "danger",
} as const;

/** Body Mass Index calculator — on your device. */
export default function BmiTool() {
  const t = useTranslations("mod-healthkit");
  const [system, setSystem] = useState<System>("metric");
  const [weight, setWeight] = useState("");
  const [height, setHeight] = useState("");

  const result = useMemo(() => {
    const w = Number(weight);
    const h = Number(height);
    if (weight === "" || height === "") return null;
    return system === "metric" ? bmiMetric(w, h) : bmiImperial(w, h);
  }, [system, weight, height]);

  const systems: System[] = ["metric", "imperial"];

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap gap-2">
        {systems.map((s) => (
          <Button
            key={s}
            type="button"
            size="sm"
            variant={system === s ? "primary" : "secondary"}
            onClick={() => setSystem(s)}
          >
            {t(`ui.${s}`)}
          </Button>
        ))}
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="bmi-weight">
            {system === "metric" ? t("ui.weightKg") : t("ui.weightLb")}
          </Label>
          <Input
            id="bmi-weight"
            type="number"
            inputMode="decimal"
            value={weight}
            onChange={(event) => setWeight(event.target.value)}
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="bmi-height">
            {system === "metric" ? t("ui.heightCm") : t("ui.heightIn")}
          </Label>
          <Input
            id="bmi-height"
            type="number"
            inputMode="decimal"
            value={height}
            onChange={(event) => setHeight(event.target.value)}
          />
        </div>
      </div>

      {result?.error ? (
        <Alert variant="danger">
          <AlertDescription>{result.error}</AlertDescription>
        </Alert>
      ) : result?.bmi !== undefined ? (
        <div className="flex items-center gap-4 rounded-lg border border-border p-4">
          <span className="text-4xl font-bold tabular-nums">{result.bmi}</span>
          <div className="flex flex-col gap-1">
            <span className="text-sm text-text-muted">{t("ui.bmi")}</span>
            <Badge variant={CATEGORY_VARIANT[result.category!]}>{t(`ui.${result.category!}`)}</Badge>
          </div>
        </div>
      ) : null}
    </div>
  );
}
