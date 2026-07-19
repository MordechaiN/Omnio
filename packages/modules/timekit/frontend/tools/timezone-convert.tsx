"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Input, Label, Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@omnio/ui";

const ZONES = [
  "UTC",
  "America/Los_Angeles",
  "America/New_York",
  "America/Sao_Paulo",
  "Europe/London",
  "Europe/Paris",
  "Europe/Berlin",
  "Asia/Jerusalem",
  "Europe/Moscow",
  "Asia/Dubai",
  "Asia/Kolkata",
  "Asia/Singapore",
  "Asia/Shanghai",
  "Asia/Tokyo",
  "Australia/Sydney",
  "Pacific/Auckland",
] as const;

/** Timezone converter — pick a moment, see it everywhere. Intl does the math. */
export default function TimezoneConvertTool() {
  const t = useTranslations("mod-timekit");
  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  const [local, setLocal] = useState(
    `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}T${pad(now.getHours())}:${pad(now.getMinutes())}`,
  );
  const [fromZone, setFromZone] = useState<string>(
    Intl.DateTimeFormat().resolvedOptions().timeZone,
  );

  // Interpret the picked wall-clock time in the source zone by asking Intl
  // what UTC instant shows that wall time there (fixed-point in two passes).
  function sourceInstant(): Date | null {
    const parsed = new Date(local);
    if (Number.isNaN(parsed.getTime())) return null;
    let guess = parsed.getTime();
    for (let i = 0; i < 2; i += 1) {
      const inZone = new Date(new Date(guess).toLocaleString("en-US", { timeZone: fromZone }));
      guess += parsed.getTime() - inZone.getTime();
    }
    return new Date(guess);
  }

  const instant = sourceInstant();
  const zones = [...new Set([fromZone, ...ZONES])];

  return (
    <div className="flex flex-col gap-5">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="tz-when">{t("ui.tzWhen")}</Label>
          <Input
            id="tz-when"
            dir="ltr"
            type="datetime-local"
            value={local}
            onChange={(event) => setLocal(event.target.value)}
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="tz-from">{t("ui.tzFrom")}</Label>
          <Select value={fromZone} onValueChange={setFromZone}>
            <SelectTrigger id="tz-from">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {zones.map((zone) => (
                <SelectItem key={zone} value={zone}>
                  {zone.replace(/_/g, " ")}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {instant ? (
        <ul className="flex flex-col gap-1.5" aria-label={t("ui.tzResults")}>
          {ZONES.map((zone) => {
            const formatted = new Intl.DateTimeFormat(undefined, {
              timeZone: zone,
              weekday: "short",
              month: "short",
              day: "numeric",
              hour: "2-digit",
              minute: "2-digit",
              hour12: false,
            }).format(instant);
            return (
              <li
                key={zone}
                className={`flex items-center justify-between gap-4 rounded-lg border px-3 py-2 text-sm ${
                  zone === fromZone
                    ? "border-accent/40 bg-accent-subtle"
                    : "border-border-subtle bg-surface"
                }`}
              >
                <span dir="ltr" className="font-medium">
                  {zone.replace(/_/g, " ")}
                </span>
                <span dir="ltr" className="tabular-nums text-text-secondary">
                  {formatted}
                </span>
              </li>
            );
          })}
        </ul>
      ) : (
        <p role="alert" className="text-sm text-danger">
          {t("ui.tzInvalid")}
        </p>
      )}
    </div>
  );
}
