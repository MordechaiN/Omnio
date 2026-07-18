"use client";

import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { Alert, AlertDescription, Button, Label, Textarea, toast } from "@omnio/ui";
import { csvToJson, jsonToCsv } from "../../shared/csv-json.ts";

type Mode = "csvToJson" | "jsonToCsv";

/** CSV ⇄ JSON converter — on your device. */
export default function CsvJsonTool() {
  const t = useTranslations("mod-csvkit");
  const [mode, setMode] = useState<Mode>("csvToJson");
  const [input, setInput] = useState("");

  const result = useMemo(
    () => (mode === "csvToJson" ? csvToJson(input) : jsonToCsv(input)),
    [mode, input],
  );

  const modes: Mode[] = ["csvToJson", "jsonToCsv"];

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
          <Label htmlFor="cj-input">{t("ui.input")}</Label>
          <Textarea
            id="cj-input"
            dir="ltr"
            className="min-h-64 font-mono text-sm"
            value={input}
            onChange={(event) => setInput(event.target.value)}
            placeholder={t(mode === "csvToJson" ? "ui.csvPlaceholder" : "ui.jsonPlaceholder")}
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <div className="flex items-center justify-between">
            <Label htmlFor="cj-output">{t("ui.output")}</Label>
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
              id="cj-output"
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
