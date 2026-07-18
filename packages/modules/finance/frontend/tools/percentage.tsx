"use client";

import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { Input, Label } from "@omnio/ui";
import { percentChange, percentOf } from "../../shared/finance.ts";

/** Percentage calculator — of / change — on your device. */
export default function PercentageTool() {
  const t = useTranslations("mod-finance");
  const [part, setPart] = useState("25");
  const [whole, setWhole] = useState("200");
  const [from, setFrom] = useState("80");
  const [to, setTo] = useState("100");

  const ofResult = useMemo(() => percentOf(Number(part), Number(whole)), [part, whole]);
  const changeResult = useMemo(() => percentChange(Number(from), Number(to)), [from, to]);

  return (
    <div className="flex flex-col gap-6">
      <section className="flex flex-col gap-3">
        <h3 className="text-sm font-semibold">{t("ui.percentOfTitle")}</h3>
        <div className="grid items-end gap-3 sm:grid-cols-[1fr_1fr_auto]">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="pc-part">{t("ui.part")}</Label>
            <Input id="pc-part" type="number" inputMode="decimal" value={part} onChange={(e) => setPart(e.target.value)} />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="pc-whole">{t("ui.whole")}</Label>
            <Input id="pc-whole" type="number" inputMode="decimal" value={whole} onChange={(e) => setWhole(e.target.value)} />
          </div>
          <p dir="ltr" className="pb-2 text-2xl font-semibold tabular-nums">{ofResult}%</p>
        </div>
      </section>

      <section className="flex flex-col gap-3">
        <h3 className="text-sm font-semibold">{t("ui.percentChangeTitle")}</h3>
        <div className="grid items-end gap-3 sm:grid-cols-[1fr_1fr_auto]">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="pc-from">{t("ui.fromValue")}</Label>
            <Input id="pc-from" type="number" inputMode="decimal" value={from} onChange={(e) => setFrom(e.target.value)} />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="pc-to">{t("ui.toValue")}</Label>
            <Input id="pc-to" type="number" inputMode="decimal" value={to} onChange={(e) => setTo(e.target.value)} />
          </div>
          <p dir="ltr" className="pb-2 text-2xl font-semibold tabular-nums">
            {changeResult > 0 ? "+" : ""}
            {changeResult}%
          </p>
        </div>
      </section>
    </div>
  );
}
