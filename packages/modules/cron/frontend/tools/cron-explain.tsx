"use client";

import { useMemo, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Badge, Button, Input, Label } from "@omnio/ui";
import {
  nextRuns,
  parseCron,
  summarizeField,
  type CronFieldName,
  type CronParseError,
  type ParsedCron,
} from "../../shared/cron.ts";

const FIELD_ORDER: CronFieldName[] = ["minute", "hour", "dayOfMonth", "month", "dayOfWeek"];

const PRESETS = [
  "*/5 * * * *",
  "0 * * * *",
  "0 9 * * mon-fri",
  "0 0 * * 0",
  "0 3 1 * *",
] as const;

/** Cron expression explainer — parses and previews schedules on your device. */
export default function CronExplainTool() {
  const t = useTranslations("mod-cron");
  const locale = useLocale();
  const [expression, setExpression] = useState("*/15 9-17 * * mon-fri");
  // Fixed at first render so the preview list doesn't shift under the reader.
  const [reference] = useState(() => new Date());

  const parsed = useMemo<{ cron: ParsedCron; error: null } | { cron: null; error: CronParseError }>(() => {
    try {
      return { cron: parseCron(expression), error: null };
    } catch (error) {
      return { cron: null, error: error as CronParseError };
    }
  }, [expression]);

  const runs = useMemo(
    () => (parsed.cron ? nextRuns(parsed.cron, reference, 5) : []),
    [parsed.cron, reference],
  );

  const formatter = useMemo(
    () =>
      new Intl.DateTimeFormat(locale, {
        weekday: "short",
        year: "numeric",
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      }),
    [locale],
  );

  function describeField(name: CronFieldName): string {
    const summary = summarizeField(parsed.cron![name]);
    if (summary.kind === "every") return t(`ui.every.${name}`);
    const values = summary.values;
    const shown = values.slice(0, 12).join(", ");
    return values.length > 12
      ? t("ui.valuesTruncated", { values: shown, more: values.length - 12 })
      : shown;
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="cron-expression">{t("ui.expression")}</Label>
        <Input
          id="cron-expression"
          dir="ltr"
          className="font-mono"
          value={expression}
          spellCheck={false}
          autoComplete="off"
          aria-invalid={parsed.error ? true : undefined}
          aria-describedby={parsed.error ? "cron-error" : undefined}
          onChange={(event) => setExpression(event.target.value)}
        />
        {parsed.error ? (
          <p id="cron-error" role="alert" className="text-sm text-danger">
            {parsed.error.field === "expression"
              ? t("ui.errorShape")
              : t("ui.errorField", { field: t(`ui.field.${parsed.error.field}`), token: parsed.error.token })}
          </p>
        ) : null}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <span className="text-sm text-text-muted">{t("ui.presets")}</span>
        {PRESETS.map((preset) => (
          <Button
            key={preset}
            type="button"
            variant="secondary"
            size="sm"
            className="font-mono"
            onClick={() => setExpression(preset)}
          >
            <span dir="ltr">{preset}</span>
          </Button>
        ))}
      </div>

      {parsed.cron ? (
        <>
          <section className="flex flex-col gap-2" aria-label={t("ui.breakdown")}>
            <h2 className="text-sm font-semibold text-text-secondary">{t("ui.breakdown")}</h2>
            <dl className="grid gap-2 rounded-lg border border-border-subtle bg-surface p-4 sm:grid-cols-[auto_1fr] sm:gap-x-6">
              {FIELD_ORDER.map((name) => (
                <div key={name} className="contents">
                  <dt className="flex items-center gap-2 text-sm text-text-muted">
                    <Badge variant="neutral" className="font-mono">
                      <span dir="ltr">{parsed.cron![name].raw}</span>
                    </Badge>
                    {t(`ui.field.${name}`)}
                  </dt>
                  <dd dir="ltr" className="text-start text-sm tabular-nums">{describeField(name)}</dd>
                </div>
              ))}
            </dl>
          </section>

          <section className="flex flex-col gap-2" aria-label={t("ui.nextRuns")}>
            <h2 className="text-sm font-semibold text-text-secondary">{t("ui.nextRuns")}</h2>
            {runs.length === 0 ? (
              <p className="text-sm text-text-muted">{t("ui.neverRuns")}</p>
            ) : (
              <ol className="flex flex-col gap-1 rounded-lg border border-border-subtle bg-surface p-4 text-sm">
                {runs.map((run) => (
                  <li key={run.getTime()} className="tabular-nums">
                    {formatter.format(run)}
                  </li>
                ))}
              </ol>
            )}
          </section>
        </>
      ) : null}
    </div>
  );
}
