"use client";

import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { Button, Label, Textarea, toast } from "@omnio/ui";
import { runHtml, type HtmlMode } from "../../shared/html-entities.ts";

/** HTML entity encoder/decoder — on your device. */
export default function HtmlEntitiesTool() {
  const t = useTranslations("mod-htmlkit");
  const [mode, setMode] = useState<HtmlMode>("encode");
  const [input, setInput] = useState("");

  const output = useMemo(() => runHtml(mode, input), [mode, input]);

  function copy(): void {
    if (output) {
      void navigator.clipboard.writeText(output);
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
          <Label htmlFor="html-input">{t("ui.input")}</Label>
          <Textarea
            id="html-input"
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
            <Label htmlFor="html-output">{t("ui.output")}</Label>
            <Button type="button" size="sm" variant="ghost" onClick={copy} disabled={!output}>
              {t("ui.copy")}
            </Button>
          </div>
          <Textarea
            id="html-output"
            dir="ltr"
            readOnly
            spellCheck={false}
            className="min-h-48 font-mono text-sm"
            value={output}
          />
        </div>
      </div>
    </div>
  );
}
