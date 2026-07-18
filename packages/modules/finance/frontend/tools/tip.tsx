"use client";

import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { Button, Input, Label } from "@omnio/ui";
import { tip } from "../../shared/finance.ts";

const PRESETS = [10, 15, 18, 20];

/** Tip calculator with bill splitting — on your device. */
export default function TipTool() {
  const t = useTranslations("mod-finance");
  const [bill, setBill] = useState("100");
  const [pct, setPct] = useState("18");
  const [people, setPeople] = useState("2");

  const result = useMemo(() => tip(Number(bill), Number(pct), Number(people)), [bill, pct, people]);

  const rows: Array<["tip" | "total" | "perPerson", number]> = [
    ["tip", result.tip],
    ["total", result.total],
    ["perPerson", result.perPerson],
  ];

  return (
    <div className="flex flex-col gap-4">
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="tip-bill">{t("ui.bill")}</Label>
          <Input id="tip-bill" type="number" inputMode="decimal" value={bill} onChange={(e) => setBill(e.target.value)} />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="tip-pct">{t("ui.tipPercent")}</Label>
          <Input id="tip-pct" type="number" inputMode="decimal" value={pct} onChange={(e) => setPct(e.target.value)} />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="tip-people">{t("ui.people")}</Label>
          <Input id="tip-people" type="number" inputMode="numeric" value={people} onChange={(e) => setPeople(e.target.value)} />
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        {PRESETS.map((preset) => (
          <Button key={preset} type="button" size="sm" variant="secondary" onClick={() => setPct(String(preset))}>
            {preset}%
          </Button>
        ))}
      </div>

      <dl className="grid gap-2 sm:grid-cols-3">
        {rows.map(([key, value]) => (
          <div key={key} className="flex flex-col gap-1 rounded-lg border border-border p-3">
            <dt className="text-sm text-text-muted">{t(`ui.${key}`)}</dt>
            <dd dir="ltr" className="text-xl font-semibold tabular-nums">{value.toLocaleString()}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}
