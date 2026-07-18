"use client";

import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { Alert, AlertDescription, Input, Label, Switch, Textarea } from "@omnio/ui";
import { testRegex } from "../../shared/regex.ts";

const FLAGS = [
  { flag: "i", key: "ignoreCase" },
  { flag: "m", key: "multiline" },
  { flag: "s", key: "dotAll" },
  { flag: "u", key: "unicode" },
] as const;

/** Regex tester with live match highlighting — on your device. */
export default function RegexTesterTool() {
  const t = useTranslations("mod-regexlab");
  const [pattern, setPattern] = useState("");
  const [flags, setFlags] = useState<Set<string>>(new Set(["g"]));
  const [input, setInput] = useState("");

  const flagString = [...flags].join("");
  const result = useMemo(
    () => testRegex(pattern, flagString, input),
    [pattern, flagString, input],
  );

  function toggleFlag(flag: string, on: boolean): void {
    setFlags((prev) => {
      const next = new Set(prev);
      if (on) next.add(flag);
      else next.delete(flag);
      return next;
    });
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="rx-pattern">{t("ui.pattern")}</Label>
        <div className="flex items-center gap-2 font-mono">
          <span className="text-text-muted">/</span>
          <Input
            id="rx-pattern"
            dir="ltr"
            className="font-mono"
            value={pattern}
            onChange={(event) => setPattern(event.target.value)}
            placeholder={t("ui.patternPlaceholder")}
          />
          <span className="text-text-muted">/{flagString}</span>
        </div>
      </div>

      <div className="flex flex-wrap gap-4">
        {FLAGS.map(({ flag, key }) => (
          <label key={flag} className="flex items-center gap-2 text-sm">
            <Switch
              checked={flags.has(flag)}
              onCheckedChange={(checked) => toggleFlag(flag, checked)}
            />
            {t(`ui.${key}`)} <code className="text-text-muted">{flag}</code>
          </label>
        ))}
      </div>

      {result.error ? (
        <Alert variant="danger">
          <AlertDescription>{result.error}</AlertDescription>
        </Alert>
      ) : null}

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="rx-input">{t("ui.testString")}</Label>
        <Textarea
          id="rx-input"
          dir="ltr"
          className="min-h-40 font-mono text-sm"
          value={input}
          onChange={(event) => setInput(event.target.value)}
          placeholder={t("ui.testPlaceholder")}
        />
      </div>

      <div className="rounded-lg border border-border p-3">
        <p className="mb-2 text-sm text-text-muted">
          {t("ui.matchCount", { count: result.matches.length })}
        </p>
        {result.matches.length > 0 ? (
          <ol className="flex flex-col gap-1 font-mono text-sm">
            {result.matches.slice(0, 200).map((m, i) => (
              <li key={`${m.index}-${i}`} className="flex flex-wrap gap-2">
                <span className="text-text-muted">#{i + 1}</span>
                <span dir="ltr" className="text-accent">
                  {m.match || "∅"}
                </span>
                {m.groups.length > 0 ? (
                  <span dir="ltr" className="text-text-muted">
                    [{m.groups.join(", ")}]
                  </span>
                ) : null}
              </li>
            ))}
          </ol>
        ) : null}
      </div>
    </div>
  );
}
