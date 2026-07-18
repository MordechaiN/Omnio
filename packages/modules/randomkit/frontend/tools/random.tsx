"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import {
  Alert,
  AlertDescription,
  Button,
  Input,
  Label,
  Switch,
  Textarea,
  toast,
} from "@omnio/ui";
import { generateNumbers, type RandomResult } from "../../shared/random.ts";

/** Random integer generator — cryptographically strong, on your device. */
export default function RandomTool() {
  const t = useTranslations("mod-randomkit");
  const [min, setMin] = useState(1);
  const [max, setMax] = useState(100);
  const [count, setCount] = useState(5);
  const [unique, setUnique] = useState(false);
  const [result, setResult] = useState<RandomResult | null>(null);

  function roll(): void {
    setResult(generateNumbers({ min, max, count, unique }));
  }

  const text = result?.values?.join(", ") ?? "";

  return (
    <div className="flex flex-col gap-4">
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="rnd-min">{t("ui.min")}</Label>
          <Input
            id="rnd-min"
            type="number"
            value={min}
            onChange={(event) => setMin(Number(event.target.value))}
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="rnd-max">{t("ui.max")}</Label>
          <Input
            id="rnd-max"
            type="number"
            value={max}
            onChange={(event) => setMax(Number(event.target.value))}
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="rnd-count">{t("ui.count")}</Label>
          <Input
            id="rnd-count"
            type="number"
            min={1}
            max={1000}
            value={count}
            onChange={(event) => setCount(Number(event.target.value))}
          />
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-4">
        <label className="flex items-center gap-2 text-sm">
          <Switch checked={unique} onCheckedChange={setUnique} />
          {t("ui.unique")}
        </label>
        <Button type="button" onClick={roll}>
          {t("ui.generate")}
        </Button>
      </div>

      {result?.error ? (
        <Alert variant="danger">
          <AlertDescription>{result.error}</AlertDescription>
        </Alert>
      ) : result ? (
        <div className="flex flex-col gap-1.5">
          <div className="flex items-center justify-between">
            <Label htmlFor="rnd-out">{t("ui.result")}</Label>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              onClick={() => {
                void navigator.clipboard.writeText(text);
                toast.success(t("ui.copied"));
              }}
            >
              {t("ui.copy")}
            </Button>
          </div>
          <Textarea
            id="rnd-out"
            dir="ltr"
            readOnly
            className="min-h-24 font-mono text-sm"
            value={text}
          />
        </div>
      ) : null}
    </div>
  );
}
