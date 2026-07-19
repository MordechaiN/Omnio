"use client";

import { useMemo, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Input, Label } from "@omnio/ui";
import { isValidInput, projectGrowth, type InterestInput } from "../../shared/interest.ts";

function NumberField({
  id,
  label,
  value,
  onChange,
  min,
  max,
  step,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  min: number;
  max?: number;
  step?: number;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <Label htmlFor={id}>{label}</Label>
      <Input
        id={id}
        dir="ltr"
        type="number"
        inputMode="decimal"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(event) => onChange(event.target.value)}
      />
    </div>
  );
}

/** Compound interest projection — computed on your device as you type. */
export default function CompoundInterestTool() {
  const t = useTranslations("mod-interest");
  const locale = useLocale();
  const [principal, setPrincipal] = useState("10000");
  const [monthly, setMonthly] = useState("250");
  const [rate, setRate] = useState("5");
  const [years, setYears] = useState("10");

  const input: InterestInput = {
    principal: Number(principal),
    monthlyContribution: Number(monthly),
    annualRatePercent: Number(rate),
    years: Number(years),
  };
  const valid = isValidInput(input);
  const result = useMemo(() => (valid ? projectGrowth(input) : null), [principal, monthly, rate, years, valid]);

  const money = useMemo(
    () => new Intl.NumberFormat(locale, { maximumFractionDigits: 0 }),
    [locale],
  );

  return (
    <div className="flex flex-col gap-6">
      <div className="grid gap-4 sm:grid-cols-2">
        <NumberField id="ci-principal" label={t("ui.principal")} value={principal} onChange={setPrincipal} min={0} />
        <NumberField id="ci-monthly" label={t("ui.monthly")} value={monthly} onChange={setMonthly} min={0} />
        <NumberField id="ci-rate" label={t("ui.rate")} value={rate} onChange={setRate} min={0} max={100} step={0.1} />
        <NumberField id="ci-years" label={t("ui.years")} value={years} onChange={setYears} min={1} max={100} />
      </div>

      {!valid ? (
        <p role="alert" className="text-sm text-danger">
          {t("ui.invalid")}
        </p>
      ) : result ? (
        <>
          <dl className="grid grid-cols-1 gap-3 sm:grid-cols-3" aria-live="polite">
            <div className="flex flex-col gap-1 rounded-xl border border-border-subtle bg-surface p-4">
              <dt className="text-sm text-text-muted">{t("ui.finalBalance")}</dt>
              <dd dir="ltr" className="text-start text-2xl font-semibold tabular-nums">
                {money.format(result.finalBalance)}
              </dd>
            </div>
            <div className="flex flex-col gap-1 rounded-xl border border-border-subtle bg-surface p-4">
              <dt className="text-sm text-text-muted">{t("ui.totalContributed")}</dt>
              <dd dir="ltr" className="text-start text-2xl font-semibold tabular-nums">
                {money.format(result.totalContributed)}
              </dd>
            </div>
            <div className="flex flex-col gap-1 rounded-xl border border-border-subtle bg-surface p-4">
              <dt className="text-sm text-text-muted">{t("ui.totalInterest")}</dt>
              <dd dir="ltr" className="text-start text-2xl font-semibold tabular-nums text-accent">
                {money.format(result.totalInterest)}
              </dd>
            </div>
          </dl>

          <div className="overflow-x-auto rounded-lg border border-border-subtle bg-surface">
            <table className="w-full text-sm">
              <caption className="sr-only">{t("ui.tableCaption")}</caption>
              <thead>
                <tr className="border-b border-border-subtle text-text-muted">
                  <th scope="col" className="p-3 text-start font-medium">
                    {t("ui.year")}
                  </th>
                  <th scope="col" className="p-3 text-end font-medium">
                    {t("ui.contributed")}
                  </th>
                  <th scope="col" className="p-3 text-end font-medium">
                    {t("ui.interest")}
                  </th>
                  <th scope="col" className="p-3 text-end font-medium">
                    {t("ui.balance")}
                  </th>
                </tr>
              </thead>
              <tbody>
                {result.rows.map((row) => (
                  <tr key={row.year} className="border-b border-border-subtle last:border-0">
                    <th scope="row" className="p-3 text-start font-medium tabular-nums">
                      {row.year}
                    </th>
                    <td dir="ltr" className="p-3 text-end tabular-nums">
                      {money.format(row.contributed)}
                    </td>
                    <td dir="ltr" className="p-3 text-end tabular-nums">
                      {money.format(row.interest)}
                    </td>
                    <td dir="ltr" className="p-3 text-end font-medium tabular-nums">
                      {money.format(row.balance)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <p className="text-sm text-text-muted">{t("ui.disclaimer")}</p>
        </>
      ) : null}
    </div>
  );
}
