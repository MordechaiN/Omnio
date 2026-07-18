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
import { formatJson, type IndentStyle } from "../../shared/json-format.ts";

/** JSON formatter/validator — runs entirely on the device, nothing uploaded. */
export default function JsonFormatTool() {
  const t = useTranslations("mod-jsonkit");
  const [input, setInput] = useState("");
  const [style, setStyle] = useState<IndentStyle>("2");

  const result = useMemo(() => (input.trim() ? formatJson(input, style) : null), [input, style]);

  function copy(): void {
    if (result?.ok) {
      void navigator.clipboard.writeText(result.output);
      toast.success(t("ui.copied"));
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-end gap-4">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="json-indent">{t("ui.indent")}</Label>
          <Select value={style} onValueChange={(value) => setStyle(value as IndentStyle)}>
            <SelectTrigger id="json-indent" className="w-48">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="2">{t("ui.spaces2")}</SelectItem>
              <SelectItem value="4">{t("ui.spaces4")}</SelectItem>
              <SelectItem value="tab">{t("ui.tabs")}</SelectItem>
              <SelectItem value="minify">{t("ui.minify")}</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <Button type="button" variant="secondary" onClick={copy} disabled={!result?.ok}>
          {t("ui.copy")}
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="json-input">{t("ui.input")}</Label>
          <Textarea
            id="json-input"
            dir="ltr"
            spellCheck={false}
            className="min-h-64 font-mono text-sm"
            placeholder={t("ui.placeholder")}
            value={input}
            onChange={(event) => setInput(event.target.value)}
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="json-output">{t("ui.output")}</Label>
          {result && !result.ok ? (
            <Alert variant="danger">
              <AlertDescription>
                {result.line
                  ? t("ui.errorAt", {
                      message: result.message,
                      line: result.line,
                      column: result.column ?? 1,
                    })
                  : result.message}
              </AlertDescription>
            </Alert>
          ) : (
            <Textarea
              id="json-output"
              dir="ltr"
              readOnly
              spellCheck={false}
              className="min-h-64 font-mono text-sm"
              value={result?.ok ? result.output : ""}
              placeholder={t("ui.outputPlaceholder")}
            />
          )}
        </div>
      </div>
    </div>
  );
}
