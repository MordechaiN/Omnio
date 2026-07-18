"use client";

import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import {
  Alert,
  AlertDescription,
  Button,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Textarea,
  toast,
} from "@omnio/ui";
import { runUrl, type UrlMode, type UrlScope } from "../../shared/url-encode.ts";

/** URL encoder/decoder — percent-encoding, on your device. */
export default function UrlEncodeTool() {
  const t = useTranslations("mod-urlkit");
  const [mode, setMode] = useState<UrlMode>("encode");
  const [scope, setScope] = useState<UrlScope>("component");
  const [input, setInput] = useState("");

  const result = useMemo(() => runUrl(mode, scope, input), [mode, scope, input]);

  function copy(): void {
    if (result.output) {
      void navigator.clipboard.writeText(result.output);
      toast.success(t("ui.copied"));
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-end gap-4">
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
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="url-scope">{t("ui.scope")}</Label>
          <Select value={scope} onValueChange={(value) => setScope(value as UrlScope)}>
            <SelectTrigger id="url-scope" className="w-56">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="component">{t("ui.component")}</SelectItem>
              <SelectItem value="full">{t("ui.full")}</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="url-input">{t("ui.input")}</Label>
          <Textarea
            id="url-input"
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
            <Label htmlFor="url-output">{t("ui.output")}</Label>
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
              id="url-output"
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
