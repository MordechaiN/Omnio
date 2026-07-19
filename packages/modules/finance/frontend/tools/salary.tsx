"use client";

import { useMemo, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Input, Label } from "@omnio/ui";

/** Salary converter — hourly ⇄ monthly ⇄ yearly from hours/week. */
export default function SalaryTool() {
  const t = useTranslations("mod-finance");
  const locale = useLocale();
  const [hourly, setHourly] = useState("50");
  const [hoursPerWeek, setHoursPerWeek] = useState("40");

  const rate = Number(hourly);
  const hours = Number(hoursPerWeek);
  const valid = Number.isFinite(rate) && rate >= 0 && Number.isFinite(hours) && hours > 0 && hours <= 100;
  const weekly = rate * hours;
  const yearly = weekly * 52;
  const monthly = yearly / 12;

  const money = useMemo(
    () => new Intl.NumberFormat(locale, { maximumFractionDigits: 0 }),
    [locale],
  );

  return (
    <div className="flex max-w-xl flex-col gap-5">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="sal-hourly">{t("ui.salaryHourly")}</Label>
          <Input
            id="sal-hourly"
            dir="ltr"
            type="number"
            inputMode="decimal"
            min={0}
            value={hourly}
            onChange={(event) => setHourly(event.target.value)}
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="sal-hours">{t("ui.salaryHours")}</Label>
          <Input
            id="sal-hours"
            dir="ltr"
            type="number"
            inputMode="numeric"
            min={1}
            max={100}
            value={hoursPerWeek}
            onChange={(event) => setHoursPerWeek(event.target.value)}
          />
        </div>
      </div>

      {valid ? (
        <dl aria-live="polite" className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          {(
            [
              ["salaryWeekly", weekly],
              ["salaryMonthly", monthly],
              ["salaryYearly", yearly],
            ] as const
          ).map(([key, value]) => (
            <div key={key} className="flex flex-col gap-1 rounded-xl border border-border-subtle bg-surface p-4">
              <dt className="text-sm text-text-muted">{t(`ui.${key}`)}</dt>
              <dd dir="ltr" className="text-start text-2xl font-semibold tabular-nums">
                {money.format(value)}
              </dd>
            </div>
          ))}
        </dl>
      ) : (
        <p role="alert" className="text-sm text-danger">
          {t("ui.salaryInvalid")}
        </p>
      )}
      <p className="text-sm text-text-muted">{t("ui.salaryNote")}</p>
    </div>
  );
}
