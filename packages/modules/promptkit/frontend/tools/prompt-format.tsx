"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Button, Input, Label, Switch, Textarea, toast } from "@omnio/ui";
import { formatPrompt } from "../../shared/format.ts";

/** Prompt formatter — clean up whitespace before pasting a prompt anywhere. */
export default function PromptFormatTool() {
  const t = useTranslations("mod-promptkit");
  const [text, setText] = useState("");
  const [collapseBlankLines, setCollapseBlankLines] = useState(true);
  const [trimTrailingSpaces, setTrimTrailingSpaces] = useState(true);
  const [dedent, setDedent] = useState(false);
  const [wrap, setWrap] = useState(false);
  const [wrapWidth, setWrapWidth] = useState(80);

  const output = formatPrompt(text, {
    collapseBlankLines,
    trimTrailingSpaces,
    dedent,
    wrapWidth: wrap ? wrapWidth : null,
  });

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="pf-input">{t("ui.formatInput")}</Label>
        <Textarea
          id="pf-input"
          dir="auto"
          className="min-h-48 font-mono text-sm"
          value={text}
          onChange={(event) => setText(event.target.value)}
        />
      </div>

      <div className="flex flex-wrap items-center gap-6">
        <div className="flex items-center gap-2">
          <Switch id="pf-blank" checked={collapseBlankLines} onCheckedChange={setCollapseBlankLines} />
          <Label htmlFor="pf-blank">{t("ui.formatCollapseBlank")}</Label>
        </div>
        <div className="flex items-center gap-2">
          <Switch id="pf-trailing" checked={trimTrailingSpaces} onCheckedChange={setTrimTrailingSpaces} />
          <Label htmlFor="pf-trailing">{t("ui.formatTrimTrailing")}</Label>
        </div>
        <div className="flex items-center gap-2">
          <Switch id="pf-dedent" checked={dedent} onCheckedChange={setDedent} />
          <Label htmlFor="pf-dedent">{t("ui.formatDedent")}</Label>
        </div>
        <div className="flex items-center gap-2">
          <Switch id="pf-wrap" checked={wrap} onCheckedChange={setWrap} />
          <Label htmlFor="pf-wrap">{t("ui.formatWrap")}</Label>
          {wrap ? (
            <Input
              dir="ltr"
              type="number"
              min={20}
              max={200}
              value={wrapWidth}
              onChange={(event) => setWrapWidth(Number(event.target.value))}
              className="w-20"
            />
          ) : null}
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="pf-output">{t("ui.formatOutput")}</Label>
        <Textarea id="pf-output" dir="auto" readOnly className="min-h-48 font-mono text-sm" value={output} />
        <div>
          <Button
            type="button"
            onClick={() => {
              void navigator.clipboard.writeText(output);
              toast(t("ui.copied"));
            }}
          >
            {t("ui.copyPrompt")}
          </Button>
        </div>
      </div>
    </div>
  );
}
