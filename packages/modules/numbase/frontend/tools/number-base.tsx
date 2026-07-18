"use client";

import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import {
  Alert,
  AlertDescription,
  Input,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  toast,
} from "@omnio/ui";
import { convertBase } from "../../shared/number-base.ts";

const BASES = [
  { radix: 2, key: "binary" },
  { radix: 8, key: "octal" },
  { radix: 10, key: "decimal" },
  { radix: 16, key: "hex" },
] as const;

/** Number base converter (binary / octal / decimal / hex) — on your device. */
export default function NumberBaseTool() {
  const t = useTranslations("mod-numbase");
  const [from, setFrom] = useState(10);
  const [input, setInput] = useState("");

  const result = useMemo(() => convertBase(input, from), [input, from]);

  function copyValue(value: string): void {
    void navigator.clipboard.writeText(value);
    toast.success(t("ui.copied"));
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-end gap-4">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="nb-from">{t("ui.from")}</Label>
          <Select value={String(from)} onValueChange={(value) => setFrom(Number(value))}>
            <SelectTrigger id="nb-from" className="w-44">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {BASES.map((base) => (
                <SelectItem key={base.radix} value={String(base.radix)}>
                  {t(`ui.${base.key}`)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex flex-1 flex-col gap-1.5">
          <Label htmlFor="nb-input">{t("ui.value")}</Label>
          <Input
            id="nb-input"
            dir="ltr"
            className="font-mono"
            value={input}
            onChange={(event) => setInput(event.target.value)}
            placeholder={t("ui.placeholder")}
          />
        </div>
      </div>

      {result.error ? (
        <Alert variant="danger">
          <AlertDescription>{result.error}</AlertDescription>
        </Alert>
      ) : (
        <dl className="grid gap-2 sm:grid-cols-2">
          {BASES.map((base) => {
            const value = result[base.key] ?? "";
            return (
              <div key={base.radix} className="flex flex-col gap-1 rounded-lg border border-border p-3">
                <dt className="text-sm text-text-muted">{t(`ui.${base.key}`)}</dt>
                <dd className="flex items-center justify-between gap-2">
                  <span dir="ltr" className="truncate font-mono">
                    {value || "—"}
                  </span>
                  {value ? (
                    <button
                      type="button"
                      className="shrink-0 text-sm text-accent hover:underline"
                      onClick={() => copyValue(value)}
                    >
                      {t("ui.copy")}
                    </button>
                  ) : null}
                </dd>
              </div>
            );
          })}
        </dl>
      )}
    </div>
  );
}
