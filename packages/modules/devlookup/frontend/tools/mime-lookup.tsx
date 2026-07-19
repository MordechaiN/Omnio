"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Badge, Button, Input, Label, toast } from "@omnio/ui";
import { searchMime } from "../../shared/mime-types.ts";

/** MIME lookup — extension ⇄ content type, copy-ready. */
export default function MimeLookupTool() {
  const t = useTranslations("mod-devlookup");
  const [query, setQuery] = useState("");
  const results = searchMime(query);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex max-w-sm flex-col gap-1.5">
        <Label htmlFor="mime-query">{t("ui.mimeSearch")}</Label>
        <Input
          id="mime-query"
          dir="ltr"
          placeholder=".webp, video, spreadsheet…"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
        />
      </div>

      {results.length === 0 ? (
        <p className="text-sm text-text-muted">{t("ui.noMatches")}</p>
      ) : (
        <ul className="flex flex-col gap-1.5">
          {results.slice(0, 30).map((entry) => (
            <li
              key={`${entry.extension}-${entry.mime}`}
              className="flex items-center gap-3 rounded-lg border border-border-subtle bg-surface px-3 py-2"
            >
              <Badge variant="neutral">
                <span dir="ltr">.{entry.extension}</span>
              </Badge>
              <code dir="ltr" className="min-w-0 flex-1 truncate text-start font-mono text-sm">
                {entry.mime}
              </code>
              <span className="hidden text-sm text-text-muted sm:block">{entry.label}</span>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => {
                  void navigator.clipboard.writeText(entry.mime);
                  toast(t("ui.copiedMime", { mime: entry.mime }));
                }}
              >
                {t("ui.copy")}
              </Button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
