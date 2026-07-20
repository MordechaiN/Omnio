"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { takePendingFiles } from "@omnio/module-sdk";
import { Textarea } from "@omnio/ui";
import { estimateTokens } from "../../shared/prompt.ts";

const CONTEXT_SIZES = [4_000, 8_000, 32_000, 128_000, 200_000] as const;

/** Token estimator — characters, words, and a heuristic token count. */
export default function TokenEstimateTool() {
  const t = useTranslations("mod-promptkit");
  const [text, setText] = useState("");

  useEffect(() => {
    const handed = takePendingFiles()?.[0];
    if (handed && handed.size < 2 * 1024 * 1024) void handed.text().then(setText);
  }, []);

  const estimate = estimateTokens(text);

  return (
    <div className="flex flex-col gap-4">
      <Textarea
        dir="auto"
        aria-label={t("ui.textLabel")}
        className="min-h-48 font-mono text-sm"
        placeholder={t("ui.placeholder")}
        value={text}
        spellCheck={false}
        onChange={(event) => setText(event.target.value)}
      />

      <dl aria-live="polite" className="grid grid-cols-3 gap-3">
        {(
          [
            ["characters", estimate.characters],
            ["words", estimate.words],
            ["tokens", estimate.tokens],
          ] as const
        ).map(([key, value]) => (
          <div key={key} className="flex flex-col gap-1 rounded-xl border border-border-subtle bg-surface p-4">
            <dt className="text-sm text-text-muted">{t(`ui.${key}`)}</dt>
            <dd dir="ltr" className="text-start text-2xl font-semibold tabular-nums">
              {key === "tokens" ? `≈ ${value.toLocaleString()}` : value.toLocaleString()}
            </dd>
          </div>
        ))}
      </dl>

      {estimate.tokens > 0 ? (
        <div className="flex flex-col gap-2 rounded-lg border border-border-subtle bg-surface p-4">
          <p className="text-sm font-medium">{t("ui.contextTitle")}</p>
          <ul className="flex flex-wrap gap-2">
            {CONTEXT_SIZES.map((size) => {
              const fits = estimate.tokens <= size;
              const share = Math.min(100, Math.round((estimate.tokens / size) * 100));
              return (
                <li
                  key={size}
                  className={`rounded-md border px-2.5 py-1 text-xs tabular-nums ${
                    fits ? "border-border-subtle text-text-secondary" : "border-danger/40 text-danger"
                  }`}
                >
                  <span dir="ltr">
                    {size / 1000}K · {share}%
                  </span>
                </li>
              );
            })}
          </ul>
        </div>
      ) : null}
      <p className="text-sm text-text-muted">{t("ui.disclaimer")}</p>
    </div>
  );
}
