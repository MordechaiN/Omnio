"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Button, Input, Label, Textarea, toast } from "@omnio/ui";
import { extractVariables, fillTemplate } from "../../shared/prompt.ts";

const SAMPLE = `You are a {{role}}.

Rewrite the following text for {{audience}}, keeping the tone {{tone}}:

{{text}}`;

/**
 * Prompt variables — write a template with {{placeholders}}, fill the
 * auto-generated form, copy the result. Local-only today; the same template
 * contract is what a provider adapter would consume later.
 */
export default function PromptVarsTool() {
  const t = useTranslations("mod-promptkit");
  const [template, setTemplate] = useState(SAMPLE);
  const [values, setValues] = useState<Record<string, string>>({});

  const variables = extractVariables(template);
  const filled = fillTemplate(template, values);
  const complete = variables.every((name) => (values[name] ?? "") !== "");

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="pv-template">{t("ui.templateLabel")}</Label>
          <Textarea
            id="pv-template"
            dir="auto"
            className="min-h-48 font-mono text-sm"
            value={template}
            spellCheck={false}
            onChange={(event) => setTemplate(event.target.value)}
          />
          <p className="text-sm text-text-muted">{t("ui.templateHint")}</p>
        </div>

        {variables.length > 0 ? (
          <div className="flex flex-col gap-3">
            {variables.map((name) => (
              <div key={name} className="flex flex-col gap-1.5">
                <Label htmlFor={`pv-${name}`}>
                  <code dir="ltr" className="font-mono">{`{{${name}}}`}</code>
                </Label>
                <Input
                  id={`pv-${name}`}
                  dir="auto"
                  value={values[name] ?? ""}
                  onChange={(event) =>
                    setValues((previous) => ({ ...previous, [name]: event.target.value }))
                  }
                />
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-text-muted">{t("ui.noVariables")}</p>
        )}
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="pv-output">{t("ui.outputLabel")}</Label>
        <Textarea
          id="pv-output"
          dir="auto"
          readOnly
          className="min-h-64 flex-1 font-mono text-sm"
          value={filled}
        />
        <div className="flex items-center gap-3">
          <Button
            type="button"
            onClick={() => {
              void navigator.clipboard.writeText(filled);
              toast(t("ui.copied"));
            }}
          >
            {t("ui.copyPrompt")}
          </Button>
          {!complete && variables.length > 0 ? (
            <span className="text-sm text-text-muted">{t("ui.incomplete")}</span>
          ) : null}
        </div>
      </div>
    </div>
  );
}
