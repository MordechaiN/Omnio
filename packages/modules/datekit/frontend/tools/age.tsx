"use client";

import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { Alert, AlertDescription, Input, Label } from "@omnio/ui";
import { diffYMD, parseDate, totalDays } from "../../shared/date.ts";

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

/** Age calculator — exact years, months and days — on your device. */
export default function AgeTool() {
  const t = useTranslations("mod-datekit");
  const [birth, setBirth] = useState("");
  const [asOf, setAsOf] = useState(today());

  const result = useMemo(() => {
    const b = parseDate(birth);
    const a = parseDate(asOf);
    if (!b || !a) return null;
    return { ymd: diffYMD(b, a), days: totalDays(b, a) };
  }, [birth, asOf]);

  return (
    <div className="flex flex-col gap-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="age-birth">{t("ui.birthDate")}</Label>
          <Input id="age-birth" type="date" value={birth} onChange={(e) => setBirth(e.target.value)} />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="age-asof">{t("ui.asOf")}</Label>
          <Input id="age-asof" type="date" value={asOf} onChange={(e) => setAsOf(e.target.value)} />
        </div>
      </div>

      {birth && !result ? (
        <Alert variant="warning">
          <AlertDescription>{t("ui.invalid")}</AlertDescription>
        </Alert>
      ) : result ? (
        <div className="flex flex-col gap-3 rounded-lg border border-border p-4">
          <p className="text-2xl font-semibold">
            {t("ui.ageResult", {
              years: result.ymd.years,
              months: result.ymd.months,
              days: result.ymd.days,
            })}
          </p>
          <p className="text-sm text-text-muted">{t("ui.totalDays", { days: result.days })}</p>
        </div>
      ) : null}
    </div>
  );
}
