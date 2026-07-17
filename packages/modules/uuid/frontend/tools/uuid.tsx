"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@omnio/ui";
import { generateUuids } from "../../shared/generate.ts";
import { uuidOptionsSchema, type UuidVersion } from "../../shared/options.ts";

/**
 * UUID generator surface — the browser-tier reference tool. Runs entirely on the
 * device; nothing is uploaded ("runs on your device").
 */
export default function UuidTool() {
  const t = useTranslations("mod-uuid");
  const [version, setVersion] = useState<UuidVersion>("v4");
  const [count, setCount] = useState(5);
  const [results, setResults] = useState<string[]>([]);

  function generate(): void {
    const options = uuidOptionsSchema.parse({ version, count });
    setResults(generateUuids(options.count, options.version));
  }

  function copyAll(): void {
    void navigator.clipboard.writeText(results.join("\n"));
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-end gap-4">
        <label className="flex flex-col gap-1 text-sm">
          {t("ui.version")}
          <select
            className="rounded-md border border-border bg-background px-2 py-1"
            value={version}
            onChange={(event) => setVersion(event.target.value as UuidVersion)}
          >
            <option value="v4">{t("ui.v4")}</option>
            <option value="v7">{t("ui.v7")}</option>
          </select>
        </label>

        <label className="flex flex-col gap-1 text-sm">
          {t("ui.count")}
          <input
            className="w-24 rounded-md border border-border bg-background px-2 py-1"
            type="number"
            min={1}
            max={100}
            value={count}
            onChange={(event) => setCount(Number(event.target.value))}
          />
        </label>

        <Button type="button" onClick={generate}>
          {t("ui.generate")}
        </Button>
      </div>

      {results.length === 0 ? (
        <p className="text-sm text-muted-foreground">{t("ui.empty")}</p>
      ) : (
        <div className="flex flex-col gap-2">
          <ul className="flex flex-col gap-1 font-mono text-sm">
            {results.map((id) => (
              <li key={id}>{id}</li>
            ))}
          </ul>
          <div>
            <Button type="button" variant="secondary" onClick={copyAll}>
              {t("ui.copy")}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
