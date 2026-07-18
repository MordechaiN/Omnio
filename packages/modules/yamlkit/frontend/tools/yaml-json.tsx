"use client";

import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { Alert, AlertDescription, Button, Label, Textarea, toast } from "@omnio/ui";
import { jsonToYaml, yamlToJson } from "../../shared/yaml-json.ts";

type Mode = "yamlToJson" | "jsonToYaml";

/** YAML ⇄ JSON converter — on your device. */
export default function YamlJsonTool() {
  const t = useTranslations("mod-yamlkit");
  const [mode, setMode] = useState<Mode>("yamlToJson");
  const [input, setInput] = useState("");

  const result = useMemo(
    () => (mode === "yamlToJson" ? yamlToJson(input) : jsonToYaml(input)),
    [mode, input],
  );

  const modes: Mode[] = ["yamlToJson", "jsonToYaml"];

  function copyOutput(): void {
    if (result.output) {
      void navigator.clipboard.writeText(result.output);
      toast.success(t("ui.copied"));
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap gap-2">
        {modes.map((m) => (
          <Button
            key={m}
            type="button"
            size="sm"
            variant={mode === m ? "primary" : "secondary"}
            onClick={() => setMode(m)}
          >
            {t(`ui.${m}`)}
          </Button>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="yj-input">{t("ui.input")}</Label>
          <Textarea
            id="yj-input"
            dir="ltr"
            className="min-h-64 font-mono text-sm"
            value={input}
            onChange={(event) => setInput(event.target.value)}
            placeholder={t(mode === "yamlToJson" ? "ui.yamlPlaceholder" : "ui.jsonPlaceholder")}
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <div className="flex items-center justify-between">
            <Label htmlFor="yj-output">{t("ui.output")}</Label>
            <Button type="button" size="sm" variant="ghost" onClick={copyOutput}>
              {t("ui.copy")}
            </Button>
          </div>
          {result.error ? (
            <Alert variant="danger">
              <AlertDescription dir="ltr">{result.error}</AlertDescription>
            </Alert>
          ) : (
            <Textarea
              id="yj-output"
              dir="ltr"
              readOnly
              className="min-h-64 font-mono text-sm"
              value={result.output ?? ""}
            />
          )}
        </div>
      </div>
    </div>
  );
}
