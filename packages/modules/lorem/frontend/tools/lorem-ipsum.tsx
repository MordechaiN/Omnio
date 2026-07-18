"use client";

import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import {
  Button,
  Input,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Textarea,
  toast,
} from "@omnio/ui";
import { generateLorem, type LoremUnit } from "../../shared/lorem.ts";

/** Lorem Ipsum placeholder text generator — on your device. */
export default function LoremIpsumTool() {
  const t = useTranslations("mod-lorem");
  const [unit, setUnit] = useState<LoremUnit>("paragraphs");
  const [count, setCount] = useState(3);
  const [seed, setSeed] = useState(1);

  const output = useMemo(() => generateLorem(unit, count, seed), [unit, count, seed]);

  function copy(): void {
    void navigator.clipboard.writeText(output);
    toast.success(t("ui.copied"));
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-end gap-4">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="lorem-unit">{t("ui.unit")}</Label>
          <Select value={unit} onValueChange={(value) => setUnit(value as LoremUnit)}>
            <SelectTrigger id="lorem-unit" className="w-44">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="words">{t("ui.words")}</SelectItem>
              <SelectItem value="sentences">{t("ui.sentences")}</SelectItem>
              <SelectItem value="paragraphs">{t("ui.paragraphs")}</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="flex w-28 flex-col gap-1.5">
          <Label htmlFor="lorem-count">{t("ui.count")}</Label>
          <Input
            id="lorem-count"
            type="number"
            min={1}
            max={200}
            value={count}
            onChange={(event) => setCount(Math.max(1, Number(event.target.value)))}
          />
        </div>
        <Button type="button" variant="secondary" onClick={() => setSeed((s) => s + 1)}>
          {t("ui.shuffle")}
        </Button>
        <Button type="button" variant="ghost" onClick={copy}>
          {t("ui.copy")}
        </Button>
      </div>

      <Textarea
        readOnly
        aria-label={t("ui.output")}
        className="min-h-64 leading-relaxed"
        value={output}
      />
    </div>
  );
}
