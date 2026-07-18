"use client";

import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { Label, Textarea } from "@omnio/ui";
import { diffLines, summarize } from "../../shared/text-diff.ts";

const ROW_STYLES: Record<string, string> = {
  equal: "text-text-secondary",
  add: "bg-success-subtle text-success-subtle-fg",
  remove: "bg-danger-subtle text-danger-subtle-fg",
};

const SIGNS: Record<string, string> = { equal: " ", add: "+", remove: "−" };

/** Text diff — line-by-line comparison, on your device. */
export default function TextDiffTool() {
  const t = useTranslations("mod-textdiff");
  const [left, setLeft] = useState("");
  const [right, setRight] = useState("");

  const rows = useMemo(() => diffLines(left, right), [left, right]);
  const summary = useMemo(() => summarize(rows), [rows]);
  const showDiff = left !== "" || right !== "";

  return (
    <div className="flex flex-col gap-4">
      <div className="grid gap-4 md:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="diff-left">{t("ui.original")}</Label>
          <Textarea
            id="diff-left"
            dir="ltr"
            className="min-h-40 font-mono text-sm"
            value={left}
            onChange={(event) => setLeft(event.target.value)}
            placeholder={t("ui.placeholder")}
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="diff-right">{t("ui.changed")}</Label>
          <Textarea
            id="diff-right"
            dir="ltr"
            className="min-h-40 font-mono text-sm"
            value={right}
            onChange={(event) => setRight(event.target.value)}
            placeholder={t("ui.placeholder")}
          />
        </div>
      </div>

      {showDiff ? (
        <div className="flex flex-col gap-2">
          <p className="text-sm text-text-muted">
            {t("ui.summary", { added: summary.added, removed: summary.removed })}
          </p>
          <div
            dir="ltr"
            className="overflow-x-auto rounded-lg border border-border font-mono text-sm"
          >
            {rows.map((row, index) => (
              <div
                key={index}
                className={`flex gap-3 whitespace-pre px-3 py-0.5 ${ROW_STYLES[row.op]}`}
              >
                <span aria-hidden className="select-none opacity-70">
                  {SIGNS[row.op]}
                </span>
                <span>{row.text || " "}</span>
              </div>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}
