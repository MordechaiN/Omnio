"use client";

import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { Alert, AlertDescription, Input, Label } from "@omnio/ui";
import { diffYMD, parseDate, totalDays } from "../../shared/date.ts";

/** Duration between two dates — on your device. */
export default function DateDurationTool() {
  const t = useTranslations("mod-datekit");
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");

  const result = useMemo(() => {
    const a = parseDate(start);
    const b = parseDate(end);
    if (!a || !b) return null;
    return { ymd: diffYMD(a, b), days: totalDays(a, b) };
  }, [start, end]);

  return (
    <div className="flex flex-col gap-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="dd-start">{t("ui.startDate")}</Label>
          <Input id="dd-start" type="date" value={start} onChange={(e) => setStart(e.target.value)} />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="dd-end">{t("ui.endDate")}</Label>
          <Input id="dd-end" type="date" value={end} onChange={(e) => setEnd(e.target.value)} />
        </div>
      </div>

      {(start || end) && !result ? (
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
