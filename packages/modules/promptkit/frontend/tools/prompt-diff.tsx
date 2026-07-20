"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Badge, Textarea } from "@omnio/ui";
import { diffLines } from "../../shared/diff.ts";

/** Prompt diff — compare two prompt drafts line by line. */
export default function PromptDiffTool() {
  const t = useTranslations("mod-promptkit");
  const [before, setBefore] = useState("");
  const [after, setAfter] = useState("");

  const rows = before === "" && after === "" ? [] : diffLines(before, after);
  const added = rows.filter((row) => row.op === "add").length;
  const removed = rows.filter((row) => row.op === "remove").length;

  return (
    <div className="flex flex-col gap-5">
      <div className="grid gap-4 lg:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <label htmlFor="pd-before" className="text-sm font-medium">
            {t("ui.diffBefore")}
          </label>
          <Textarea
            id="pd-before"
            dir="auto"
            className="min-h-56 font-mono text-sm"
            value={before}
            onChange={(event) => setBefore(event.target.value)}
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <label htmlFor="pd-after" className="text-sm font-medium">
            {t("ui.diffAfter")}
          </label>
          <Textarea
            id="pd-after"
            dir="auto"
            className="min-h-56 font-mono text-sm"
            value={after}
            onChange={(event) => setAfter(event.target.value)}
          />
        </div>
      </div>

      {rows.length > 0 ? (
        <>
          <div className="flex items-center gap-2">
            <Badge variant="accent">+{added}</Badge>
            <Badge variant="neutral">−{removed}</Badge>
          </div>
          <ol className="flex flex-col overflow-hidden rounded-lg border border-border-subtle font-mono text-sm">
            {rows.map((row, index) => (
              <li
                key={index}
                dir="auto"
                className={
                  row.op === "add"
                    ? "bg-accent-subtle px-3 py-1 text-accent-subtle-fg"
                    : row.op === "remove"
                      ? "bg-surface-raised px-3 py-1 text-text-muted line-through"
                      : "px-3 py-1"
                }
              >
                <span aria-hidden="true" className="me-2 select-none text-text-disabled">
                  {row.op === "add" ? "+" : row.op === "remove" ? "−" : " "}
                </span>
                {row.text || " "}
              </li>
            ))}
          </ol>
        </>
      ) : null}
    </div>
  );
}
