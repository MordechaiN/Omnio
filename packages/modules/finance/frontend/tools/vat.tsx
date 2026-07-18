"use client";

import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { Button, Input, Label } from "@omnio/ui";
import { vat } from "../../shared/finance.ts";

type Mode = "add" | "extract";

/** VAT / sales-tax calculator — add or extract — on your device. */
export default function VatTool() {
  const t = useTranslations("mod-finance");
  const [amount, setAmount] = useState("100");
  const [rate, setRate] = useState("17");
  const [mode, setMode] = useState<Mode>("add");

  const result = useMemo(() => vat(Number(amount), Number(rate), mode), [amount, rate, mode]);

  const modes: Mode[] = ["add", "extract"];
  const rows: Array<["net" | "vat" | "gross", number]> = [
    ["net", result.net],
    ["vat", result.vat],
    ["gross", result.gross],
  ];

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap gap-2">
        {modes.map((m) => (
          <Button key={m} type="button" size="sm" variant={mode === m ? "primary" : "secondary"} onClick={() => setMode(m)}>
            {t(`ui.${m}`)}
          </Button>
        ))}
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="vat-amount">{mode === "add" ? t("ui.netAmount") : t("ui.grossAmount")}</Label>
          <Input id="vat-amount" type="number" inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value)} />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="vat-rate">{t("ui.vatRate")}</Label>
          <Input id="vat-rate" type="number" inputMode="decimal" value={rate} onChange={(e) => setRate(e.target.value)} />
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
