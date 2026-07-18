"use client";

import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { Alert, AlertDescription, Button, Label, Switch, Textarea, toast } from "@omnio/ui";
import { runBase64, type Base64Mode } from "../../shared/base64.ts";

/** Base64 encoder/decoder — UTF-8 safe, runs on your device. */
export default function Base64Tool() {
  const t = useTranslations("mod-base64");
  const [mode, setMode] = useState<Base64Mode>("encode");
  const [urlSafe, setUrlSafe] = useState(false);
  const [input, setInput] = useState("");

  const result = useMemo(() => runBase64(mode, input, urlSafe), [mode, input, urlSafe]);

  function copy(): void {
    if (result.output) {
      void navigator.clipboard.writeText(result.output);
      toast.success(t("ui.copied"));
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-4">
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
        <div className="flex items-center gap-2">
          <Switch id="b64-urlsafe" checked={urlSafe} onCheckedChange={setUrlSafe} />
          <Label htmlFor="b64-urlsafe">{t("ui.urlSafe")}</Label>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="b64-input">{t(mode === "encode" ? "ui.plainText" : "ui.base64")}</Label>
          <Textarea
            id="b64-input"
            dir="ltr"
            spellCheck={false}
            className="min-h-56 font-mono text-sm"
            value={input}
            onChange={(event) => setInput(event.target.value)}
            placeholder={t("ui.placeholder")}
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <div className="flex items-center justify-between">
            <Label htmlFor="b64-output">{t(mode === "encode" ? "ui.base64" : "ui.plainText")}</Label>
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
              id="b64-output"
              dir="ltr"
              readOnly
              spellCheck={false}
              className="min-h-56 font-mono text-sm"
              value={result.output}
            />
          )}
        </div>
      </div>
    </div>
  );
}
