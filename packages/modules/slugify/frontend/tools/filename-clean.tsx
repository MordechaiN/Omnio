"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Button, Label, Switch, Textarea, toast } from "@omnio/ui";
import { cleanFilename } from "../../shared/filename.ts";

/** Filename cleaner — one name per line in, safe cross-platform names out. */
export default function FilenameCleanTool() {
  const t = useTranslations("mod-slugify");
  const [input, setInput] = useState("");
  const [lowercase, setLowercase] = useState(true);
  const [dashes, setDashes] = useState(true);

  const lines = input.split("\n");
  const cleaned = lines
    .map((line) => (line.trim() === "" ? "" : cleanFilename(line, { lowercase, spacesToDashes: dashes })))
    .join("\n");

  return (
    <div className="flex flex-col gap-4">
      <Textarea
        dir="ltr"
        aria-label={t("ui.fnInput")}
        className="min-h-32 font-mono text-sm"
        placeholder={'My Report: "Final" (v2).pdf\nphoto <1>.JPG'}
        value={input}
        spellCheck={false}
        onChange={(event) => setInput(event.target.value)}
      />

      <div className="flex flex-wrap gap-6">
        <div className="flex items-center gap-2">
          <Switch id="fn-lower" checked={lowercase} onCheckedChange={setLowercase} />
          <Label htmlFor="fn-lower">{t("ui.fnLowercase")}</Label>
        </div>
        <div className="flex items-center gap-2">
          <Switch id="fn-dashes" checked={dashes} onCheckedChange={setDashes} />
          <Label htmlFor="fn-dashes">{t("ui.fnDashes")}</Label>
        </div>
      </div>

      {input.trim() !== "" ? (
        <div className="flex flex-col gap-2">
          <Textarea
            dir="ltr"
            aria-label={t("ui.fnOutput")}
            readOnly
            className="min-h-32 font-mono text-sm"
            value={cleaned}
          />
          <div>
            <Button
              type="button"
              variant="secondary"
              onClick={() => {
                void navigator.clipboard.writeText(cleaned);
                toast(t("ui.fnCopied"));
              }}
            >
              {t("ui.fnCopy")}
            </Button>
          </div>
        </div>
      ) : null}
      <p className="text-sm text-text-muted">{t("ui.fnNote")}</p>
    </div>
  );
}
