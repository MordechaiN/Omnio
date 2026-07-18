"use client";

import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { Button, Input, Label, Switch, Textarea, toast } from "@omnio/ui";
import { slugify, type SlugOptions } from "../../shared/slugify.ts";

/** Slug generator for URLs and filenames — on your device. */
export default function SlugifyTool() {
  const t = useTranslations("mod-slugify");
  const [input, setInput] = useState("");
  const [options, setOptions] = useState<SlugOptions>({
    separator: "-",
    lowercase: true,
    allowUnicode: false,
  });

  const output = useMemo(() => slugify(input, options), [input, options]);

  function copy(): void {
    if (output) {
      void navigator.clipboard.writeText(output);
      toast.success(t("ui.copied"));
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="slug-input">{t("ui.input")}</Label>
        <Textarea
          id="slug-input"
          className="min-h-24"
          value={input}
          onChange={(event) => setInput(event.target.value)}
          placeholder={t("ui.placeholder")}
        />
      </div>

      <div className="flex flex-wrap items-center gap-6">
        <div className="flex w-32 flex-col gap-1.5">
          <Label htmlFor="slug-sep">{t("ui.separator")}</Label>
          <Input
            id="slug-sep"
            dir="ltr"
            maxLength={3}
            value={options.separator}
            onChange={(event) => setOptions((o) => ({ ...o, separator: event.target.value }))}
          />
        </div>
        <label className="flex items-center gap-2 text-sm">
          <Switch
            checked={options.lowercase}
            onCheckedChange={(checked) => setOptions((o) => ({ ...o, lowercase: checked }))}
          />
          {t("ui.lowercase")}
        </label>
        <label className="flex items-center gap-2 text-sm">
          <Switch
            checked={options.allowUnicode}
            onCheckedChange={(checked) => setOptions((o) => ({ ...o, allowUnicode: checked }))}
          />
          {t("ui.unicode")}
        </label>
      </div>

      <div className="flex flex-col gap-1.5">
        <div className="flex items-center justify-between">
          <Label htmlFor="slug-output">{t("ui.output")}</Label>
          <Button type="button" size="sm" variant="ghost" onClick={copy} disabled={!output}>
            {t("ui.copy")}
          </Button>
        </div>
        <Input id="slug-output" dir="ltr" readOnly className="font-mono" value={output} />
      </div>
    </div>
  );
}
