"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Button, Label, Textarea, toast } from "@omnio/ui";
import { CASES, convertCase, type CaseId } from "../../shared/case-convert.ts";

/** Case converter — camelCase, snake_case, kebab-case and more, on your device. */
export default function CaseConvertTool() {
  const t = useTranslations("mod-casekit");
  const [input, setInput] = useState("");
  const [target, setTarget] = useState<CaseId>("title");

  const output = convertCase(input, target);

  function copy(): void {
    if (output) {
      void navigator.clipboard.writeText(output);
      toast.success(t("ui.copied"));
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="case-input">{t("ui.input")}</Label>
        <Textarea
          id="case-input"
          className="min-h-32"
          value={input}
          onChange={(event) => setInput(event.target.value)}
          placeholder={t("ui.placeholder")}
        />
      </div>

      <fieldset className="flex flex-col gap-2">
        <legend className="mb-1 text-sm font-medium">{t("ui.target")}</legend>
        <div className="flex flex-wrap gap-2">
          {CASES.map((id) => (
            <button
              key={id}
              type="button"
              aria-pressed={target === id}
              onClick={() => setTarget(id)}
              className={`rounded-full border px-3 py-1 text-sm transition-colors ${
                target === id
                  ? "border-accent bg-accent text-accent-fg"
                  : "border-border text-text-secondary hover:bg-surface-raised"
              }`}
            >
              {t(`ui.case.${id}`)}
            </button>
          ))}
        </div>
      </fieldset>

      <div className="flex flex-col gap-1.5">
        <div className="flex items-center justify-between">
          <Label htmlFor="case-output">{t("ui.output")}</Label>
          <Button type="button" size="sm" variant="ghost" onClick={copy} disabled={!output}>
            {t("ui.copy")}
          </Button>
        </div>
        <Textarea id="case-output" readOnly className="min-h-32" value={output} />
      </div>
    </div>
  );
}
