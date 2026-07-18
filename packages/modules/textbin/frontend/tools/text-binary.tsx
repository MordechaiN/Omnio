"use client";

import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { Alert, AlertDescription, Button, Label, Textarea, toast } from "@omnio/ui";
import { runTextBinary, type BinMode } from "../../shared/text-binary.ts";

/** Text ⇄ binary converter — on your device. */
export default function TextBinaryTool() {
  const t = useTranslations("mod-textbin");
  const [mode, setMode] = useState<BinMode>("encode");
  const [input, setInput] = useState("");

  const result = useMemo(() => runTextBinary(mode, input), [mode, input]);

  function copy(): void {
    if (result.output) {
      void navigator.clipboard.writeText(result.output);
      toast.success(t("ui.copied"));
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="inline-flex rounded-lg border border-border p-0.5" role="tablist">
        {(["encode", "decode"] as const).map((value) => (
          <button
            key={value}
            type="button"
            role="tab"
            aria-selected={mode === value}
            onClick={() => setMode(value)}
            className={`rounded-md px-3 py-1 text-sm transition-colors ${
              mode === value ? "bg-accent text-accent-fg" : "text-text-muted"
            }`}
          >
            {t(`ui.${value}`)}
          </button>
        ))}
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="bin-input">{t(mode === "encode" ? "ui.text" : "ui.binary")}</Label>
          <Textarea
            id="bin-input"
            dir="ltr"
            spellCheck={false}
            className="min-h-48 font-mono text-sm"
            value={input}
            onChange={(event) => setInput(event.target.value)}
            placeholder={t("ui.placeholder")}
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <div className="flex items-center justify-between">
            <Label htmlFor="bin-output">{t(mode === "encode" ? "ui.binary" : "ui.text")}</Label>
            <Button type="button" size="sm" variant="ghost" onClick={copy} disabled={!result.output}>
              {t("ui.copy")}
            </Button>
          </div>
          {result.error ? (
            <Alert variant="danger">
              <AlertDescription>{result.error}</AlertDescription>
            </Alert>
          ) : (
            <Textarea
              id="bin-output"
              dir="ltr"
              readOnly
              spellCheck={false}
              className="min-h-48 font-mono text-sm"
              value={result.output}
            />
          )}
        </div>
      </div>
    </div>
  );
}
