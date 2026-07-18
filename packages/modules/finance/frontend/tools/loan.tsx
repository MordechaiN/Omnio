"use client";

import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { Input, Label } from "@omnio/ui";
import { loanPayment } from "../../shared/finance.ts";

/** Loan / mortgage payment calculator — on your device. */
export default function LoanTool() {
  const t = useTranslations("mod-finance");
  const [principal, setPrincipal] = useState("200000");
  const [rate, setRate] = useState("6");
  const [years, setYears] = useState("30");

  const result = useMemo(
    () => loanPayment(Number(principal), Number(rate), Number(years)),
    [principal, rate, years],
  );

  const rows: Array<["monthlyPayment" | "totalPaid" | "totalInterest", number]> = [
    ["monthlyPayment", result.monthlyPayment],
    ["totalPaid", result.totalPaid],
    ["totalInterest", result.totalInterest],
  ];

  return (
    <div className="flex flex-col gap-4">
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="ln-principal">{t("ui.principal")}</Label>
          <Input id="ln-principal" type="number" inputMode="decimal" value={principal} onChange={(e) => setPrincipal(e.target.value)} />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="ln-rate">{t("ui.annualRate")}</Label>
          <Input id="ln-rate" type="number" inputMode="decimal" value={rate} onChange={(e) => setRate(e.target.value)} />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="ln-years">{t("ui.years")}</Label>
          <Input id="ln-years" type="number" inputMode="decimal" value={years} onChange={(e) => setYears(e.target.value)} />
        </div>
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
