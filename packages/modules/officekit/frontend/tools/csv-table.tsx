"use client";

import { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { takePendingFiles } from "@omnio/module-sdk";
import { Badge, Textarea } from "@omnio/ui";
import { parseCsv } from "../../shared/csv.ts";

const MAX_ROWS = 200;

/** CSV table — paste or drop a CSV and read it like a spreadsheet. */
export default function CsvTableTool() {
  const t = useTranslations("mod-officekit");
  const [text, setText] = useState("");
  const fileName = useRef<string | null>(null);

  useEffect(() => {
    const handed = takePendingFiles()?.[0];
    if (handed && handed.size < 10 * 1024 * 1024) {
      fileName.current = handed.name;
      void handed.text().then(setText);
    }
  }, []);

  const rows = text.trim() === "" ? [] : parseCsv(text);
  const header = rows[0] ?? [];
  const body = rows.slice(1, 1 + MAX_ROWS);
  const columns = Math.max(...rows.map((row) => row.length), 0);

  return (
    <div className="flex flex-col gap-4">
      <Textarea
        dir="ltr"
        aria-label={t("ui.csvInput")}
        className="min-h-28 font-mono text-sm"
        placeholder={"name,city\nDana,Haifa"}
        value={text}
        spellCheck={false}
        onChange={(event) => setText(event.target.value)}
      />

      {rows.length > 0 ? (
        <>
          <div className="flex flex-wrap gap-1.5">
            <Badge variant="neutral">{t("ui.csvRows", { count: rows.length - 1 })}</Badge>
            <Badge variant="neutral">{t("ui.csvColumns", { count: columns })}</Badge>
            {rows.length - 1 > MAX_ROWS ? (
              <Badge variant="neutral">{t("ui.csvTruncated", { max: MAX_ROWS })}</Badge>
            ) : null}
          </div>
          <div className="overflow-x-auto rounded-lg border border-border-subtle bg-surface">
            <table dir="ltr" className="w-full text-start text-sm">
              <thead>
                <tr className="border-b border-border-subtle bg-surface-raised text-text-secondary">
                  {header.map((cell, index) => (
                    <th key={index} scope="col" className="px-3 py-2 text-start font-medium whitespace-nowrap">
                      {cell || "—"}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {body.map((row, rowIndex) => (
                  <tr key={rowIndex} className="border-b border-border-subtle last:border-0">
                    {Array.from({ length: columns }, (_, columnIndex) => (
                      <td key={columnIndex} className="px-3 py-1.5 whitespace-nowrap">
                        {row[columnIndex] ?? ""}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      ) : null}
      <p className="text-sm text-text-muted">{t("ui.privacy")}</p>
    </div>
  );
}
