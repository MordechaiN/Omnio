"use client";

import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { Label, Textarea } from "@omnio/ui";
import { analyzeText } from "../../shared/text-stats.ts";

/** Word & character counter with reading time — on your device. */
export default function TextStatsTool() {
  const t = useTranslations("mod-textstats");
  const [input, setInput] = useState("");
  const stats = useMemo(() => analyzeText(input), [input]);

  const readingTime =
    stats.readingSeconds < 60
      ? t("ui.seconds", { seconds: stats.readingSeconds })
      : t("ui.minutes", { minutes: Math.round(stats.readingSeconds / 60) });

  const tiles: Array<
    [
      "words" | "characters" | "charactersNoSpaces" | "sentences" | "paragraphs" | "lines" | "readingTime",
      number | string,
    ]
  > = [
    ["words", stats.words],
    ["characters", stats.characters],
    ["charactersNoSpaces", stats.charactersNoSpaces],
    ["sentences", stats.sentences],
    ["paragraphs", stats.paragraphs],
    ["lines", stats.lines],
    ["readingTime", readingTime],
  ];

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="stats-input">{t("ui.input")}</Label>
        <Textarea
          id="stats-input"
          className="min-h-48"
          value={input}
          onChange={(event) => setInput(event.target.value)}
          placeholder={t("ui.placeholder")}
        />
      </div>

      <dl className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {tiles.map(([key, value]) => (
          <div key={key} className="flex flex-col gap-1 rounded-lg border border-border p-3">
            <dt className="text-sm text-text-muted">{t(`ui.${key}`)}</dt>
            <dd className="text-xl font-semibold tabular-nums">{value}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}
