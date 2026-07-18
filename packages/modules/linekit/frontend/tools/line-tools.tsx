"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Button, Label, Switch, Textarea, toast } from "@omnio/ui";
import {
  dedupeLines,
  removeBlankLines,
  reverseLines,
  shuffleLines,
  sortLines,
  trimLines,
  type LineOptions,
} from "../../shared/line-tools.ts";

/** Line utilities — sort, dedupe, reverse, shuffle — on your device. */
export default function LineToolsTool() {
  const t = useTranslations("mod-linekit");
  const [text, setText] = useState("");
  const [options, setOptions] = useState<LineOptions>({ trim: false, caseInsensitive: false });

  function apply(fn: (value: string) => string): void {
    setText(fn(text));
  }

  const actions: Array<
    ["sortAsc" | "sortDesc" | "dedupe" | "reverse" | "shuffle" | "removeBlank" | "trim", () => void]
  > = [
    ["sortAsc", () => apply((v) => sortLines(v, "asc", options))],
    ["sortDesc", () => apply((v) => sortLines(v, "desc", options))],
    ["dedupe", () => apply((v) => dedupeLines(v, options))],
    ["reverse", () => apply(reverseLines)],
    ["shuffle", () => apply((v) => shuffleLines(v))],
    ["removeBlank", () => apply(removeBlankLines)],
    ["trim", () => apply(trimLines)],
  ];

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap gap-2">
        {actions.map(([id, run]) => (
          <Button key={id} type="button" size="sm" variant="secondary" onClick={run}>
            {t(`ui.${id}`)}
          </Button>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-6">
        <label className="flex items-center gap-2 text-sm">
          <Switch
            checked={options.trim}
            onCheckedChange={(checked) => setOptions((o) => ({ ...o, trim: checked }))}
          />
          {t("ui.optTrim")}
        </label>
        <label className="flex items-center gap-2 text-sm">
          <Switch
            checked={options.caseInsensitive}
            onCheckedChange={(checked) => setOptions((o) => ({ ...o, caseInsensitive: checked }))}
          />
          {t("ui.optCase")}
        </label>
        <Button
          type="button"
          size="sm"
          variant="ghost"
          onClick={() => {
            if (text) {
              void navigator.clipboard.writeText(text);
              toast.success(t("ui.copied"));
            }
          }}
        >
          {t("ui.copy")}
        </Button>
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="lines-input">{t("ui.input")}</Label>
        <Textarea
          id="lines-input"
          className="min-h-64 font-mono text-sm"
          value={text}
          onChange={(event) => setText(event.target.value)}
          placeholder={t("ui.placeholder")}
        />
      </div>
    </div>
  );
}
