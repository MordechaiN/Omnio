"use client";

import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { Input, Label, Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@omnio/ui";
import { convert, unitsFor, type Category } from "../../shared/units.ts";

type UnitKey =
  | "m" | "km" | "cm" | "mm" | "mi" | "yd" | "ft" | "in"
  | "kg" | "g" | "mg" | "lb" | "oz" | "t"
  | "l" | "ml" | "m3" | "gal" | "qt" | "cup" | "floz"
  | "c" | "f" | "k";

const CATEGORIES: Category[] = ["length", "mass", "volume", "temperature"];

/** Unit converter — length, mass, volume, temperature — on your device. */
export default function UnitConvertTool() {
  const t = useTranslations("mod-units");
  const [category, setCategory] = useState<Category>("length");
  const units = unitsFor(category) as UnitKey[];
  const [from, setFrom] = useState<UnitKey>("m");
  const [to, setTo] = useState<UnitKey>("ft");
  const [value, setValue] = useState("1");

  function pickCategory(next: Category): void {
    setCategory(next);
    const list = unitsFor(next) as UnitKey[];
    setFrom(list[0]!);
    setTo(list[1] ?? list[0]!);
  }

  const result = useMemo(() => {
    const n = Number(value);
    if (value.trim() === "" || Number.isNaN(n)) return null;
    const out = convert(category, from, to, n);
    return Math.round(out * 1e6) / 1e6;
  }, [category, from, to, value]);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="uc-category">{t("ui.category")}</Label>
        <Select value={category} onValueChange={(v) => pickCategory(v as Category)}>
          <SelectTrigger id="uc-category" className="w-48">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {CATEGORIES.map((c) => (
              <SelectItem key={c} value={c}>
                {t(`ui.cat.${c}`)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="grid items-end gap-4 sm:grid-cols-[1fr_auto_1fr]">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="uc-value">{t("ui.from")}</Label>
          <Input
            id="uc-value"
            type="number"
            inputMode="decimal"
            value={value}
            onChange={(event) => setValue(event.target.value)}
          />
          <Select value={from} onValueChange={(v) => setFrom(v as UnitKey)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {units.map((u) => (
                <SelectItem key={u} value={u}>
                  {t(`ui.unit.${u}`)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="pb-2 text-center text-text-muted">→</div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="uc-result">{t("ui.to")}</Label>
          <Input
            id="uc-result"
            readOnly
            dir="ltr"
            className="font-mono"
            value={result ?? ""}
          />
          <Select value={to} onValueChange={(v) => setTo(v as UnitKey)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {units.map((u) => (
                <SelectItem key={u} value={u}>
                  {t(`ui.unit.${u}`)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
    </div>
  );
}
