"use client";

import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { Alert, AlertDescription, Button, Input, Label } from "@omnio/ui";
import { fromUnix, nowSeconds, toUnix } from "../../shared/timestamp.ts";

/** Unix timestamp ⇄ date converter — on your device. */
export default function UnixTimestampTool() {
  const t = useTranslations("mod-timekit");
  const [stamp, setStamp] = useState("");
  const [date, setDate] = useState("");

  const decoded = useMemo(() => fromUnix(stamp), [stamp]);
  const encoded = useMemo(() => toUnix(date), [date]);

  const rows: Array<["iso" | "utc" | "seconds" | "milliseconds", string | number | undefined]> = [
    ["iso", decoded.iso],
    ["utc", decoded.utc],
    ["seconds", decoded.seconds],
    ["milliseconds", decoded.milliseconds],
  ];

  return (
    <div className="flex flex-col gap-6">
      <section className="flex flex-col gap-3">
        <div className="flex items-end gap-2">
          <div className="flex flex-1 flex-col gap-1.5">
            <Label htmlFor="ts-input">{t("ui.timestamp")}</Label>
            <Input
              id="ts-input"
              dir="ltr"
              className="font-mono"
              value={stamp}
              onChange={(event) => setStamp(event.target.value)}
              placeholder={t("ui.timestampPlaceholder")}
            />
          </div>
          <Button type="button" variant="secondary" onClick={() => setStamp(String(nowSeconds()))}>
            {t("ui.now")}
          </Button>
        </div>

        {decoded.error ? (
          <Alert variant="danger">
            <AlertDescription>{decoded.error}</AlertDescription>
          </Alert>
        ) : decoded.iso ? (
          <dl className="grid gap-2 sm:grid-cols-2">
            {rows.map(([key, value]) => (
              <div key={key} className="flex flex-col gap-1 rounded-lg border border-border p-3">
                <dt className="text-sm text-text-muted">{t(`ui.${key}`)}</dt>
                <dd dir="ltr" className="font-mono text-sm">
                  {value ?? "—"}
                </dd>
              </div>
            ))}
          </dl>
        ) : null}
      </section>

      <section className="flex flex-col gap-3">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="date-input">{t("ui.date")}</Label>
          <Input
            id="date-input"
            dir="ltr"
            className="font-mono"
            value={date}
            onChange={(event) => setDate(event.target.value)}
            placeholder={t("ui.datePlaceholder")}
          />
        </div>
        {encoded.error ? (
          <Alert variant="danger">
            <AlertDescription>{encoded.error}</AlertDescription>
          </Alert>
        ) : encoded.seconds !== undefined ? (
          <p dir="ltr" className="font-mono text-sm">
            {t("ui.seconds")}: {encoded.seconds} · {t("ui.milliseconds")}: {encoded.milliseconds}
          </p>
        ) : null}
      </section>
    </div>
  );
}
