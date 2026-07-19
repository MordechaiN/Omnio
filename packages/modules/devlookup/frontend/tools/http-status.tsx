"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Badge, Input, Label } from "@omnio/ui";
import { HTTP_STATUSES, statusClass } from "../../shared/http-statuses.ts";

const CLASS_STYLE: Record<string, string> = {
  "1xx": "bg-surface-raised text-text-secondary",
  "2xx": "bg-accent-subtle text-accent-subtle-fg",
  "3xx": "bg-surface-raised text-text-secondary",
  "4xx": "bg-surface-raised text-text",
  "5xx": "bg-surface-raised text-text",
};

/** HTTP status lookup — filter by code, name, or class; explanations inline. */
export default function HttpStatusTool() {
  const t = useTranslations("mod-devlookup");
  const [query, setQuery] = useState("");

  const q = query.trim().toLowerCase();
  const filtered = HTTP_STATUSES.filter(
    (status) =>
      q === "" ||
      String(status.code).startsWith(q) ||
      status.name.toLowerCase().includes(q) ||
      statusClass(status.code).startsWith(q),
  );

  return (
    <div className="flex flex-col gap-4">
      <div className="flex max-w-sm flex-col gap-1.5">
        <Label htmlFor="hs-query">{t("ui.statusSearch")}</Label>
        <Input
          id="hs-query"
          dir="ltr"
          placeholder="404, teapot, 5xx…"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
        />
      </div>

      {filtered.length === 0 ? (
        <p className="text-sm text-text-muted">{t("ui.noMatches")}</p>
      ) : (
        <ul className="grid gap-2 sm:grid-cols-2">
          {filtered.map((status) => (
            <li
              key={status.code}
              className="flex flex-col gap-1 rounded-lg border border-border-subtle bg-surface p-3"
            >
              <div className="flex items-center gap-2">
                <Badge className={CLASS_STYLE[statusClass(status.code)]}>
                  <span dir="ltr" className="tabular-nums">
                    {status.code}
                  </span>
                </Badge>
                <span dir="ltr" className="text-sm font-medium">
                  {status.name}
                </span>
              </div>
              <p className="text-sm text-text-muted">
                {t(`status.${status.code}` as Parameters<typeof t>[0])}
              </p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
