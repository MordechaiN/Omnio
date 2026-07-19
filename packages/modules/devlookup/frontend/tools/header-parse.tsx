"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Badge, Textarea } from "@omnio/ui";
import { parseHeaderBlock } from "../../shared/headers.ts";

/** HTTP header parser — paste a raw header block, get a readable table. */
export default function HeaderParseTool() {
  const t = useTranslations("mod-devlookup");
  const [text, setText] = useState("");
  const parsed = parseHeaderBlock(text);

  return (
    <div className="flex flex-col gap-4">
      <Textarea
        dir="ltr"
        aria-label={t("ui.headersLabel")}
        className="min-h-36 font-mono text-sm"
        placeholder={"HTTP/1.1 200 OK\nContent-Type: text/html\nCache-Control: max-age=3600"}
        value={text}
        spellCheck={false}
        onChange={(event) => setText(event.target.value)}
      />

      {parsed.statusLine ? (
        <Badge variant="accent" className="self-start">
          <span dir="ltr">{parsed.statusLine}</span>
        </Badge>
      ) : null}

      {parsed.headers.length > 0 ? (
        <ul className="flex flex-col gap-1.5">
          {parsed.headers.map((header, index) => (
            <li
              key={`${header.name}-${index}`}
              className="flex flex-col gap-1 rounded-lg border border-border-subtle bg-surface px-3 py-2"
            >
              <div className="flex items-baseline gap-2">
                <code dir="ltr" className="font-mono text-sm font-semibold">
                  {header.name}
                </code>
                <code dir="ltr" className="min-w-0 flex-1 truncate text-start font-mono text-sm text-text-secondary">
                  {header.value}
                </code>
              </div>
              {header.knownKey ? (
                <p className="text-sm text-text-muted">
                  {t(`header.${header.knownKey}` as Parameters<typeof t>[0])}
                </p>
              ) : null}
            </li>
          ))}
        </ul>
      ) : text.trim() !== "" ? (
        <p className="text-sm text-text-muted">{t("ui.headersNone")}</p>
      ) : null}
    </div>
  );
}
