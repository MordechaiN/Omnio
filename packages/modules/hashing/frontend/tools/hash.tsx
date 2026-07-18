"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Label, Textarea, toast } from "@omnio/ui";
import { HASH_ALGORITHMS, hashAll, type HashAlgorithm } from "../../shared/hash.ts";

const EMPTY = Object.fromEntries(HASH_ALGORITHMS.map((a) => [a, ""])) as Record<
  HashAlgorithm,
  string
>;

/** Hash generator (SHA-1/256/384/512) — computed on your device. */
export default function HashTool() {
  const t = useTranslations("mod-hashing");
  const [input, setInput] = useState("");
  const [hashes, setHashes] = useState<Record<HashAlgorithm, string>>(EMPTY);

  useEffect(() => {
    let active = true;
    if (input === "") {
      setHashes(EMPTY);
      return;
    }
    void hashAll(input).then((result) => {
      if (active) setHashes(result);
    });
    return () => {
      active = false;
    };
  }, [input]);

  function copy(value: string): void {
    void navigator.clipboard.writeText(value);
    toast.success(t("ui.copied"));
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="hash-input">{t("ui.input")}</Label>
        <Textarea
          id="hash-input"
          className="min-h-32 font-mono text-sm"
          value={input}
          onChange={(event) => setInput(event.target.value)}
          placeholder={t("ui.placeholder")}
        />
      </div>

      <dl className="flex flex-col gap-2">
        {HASH_ALGORITHMS.map((algorithm) => (
          <div
            key={algorithm}
            className="flex flex-col gap-1 rounded-lg border border-border p-3 sm:flex-row sm:items-center sm:gap-3"
          >
            <dt className="w-24 shrink-0 text-sm font-medium">{algorithm}</dt>
            <dd className="flex min-w-0 flex-1 items-center justify-between gap-2">
              <span dir="ltr" className="truncate font-mono text-sm text-text-secondary">
                {hashes[algorithm] || "—"}
              </span>
              {hashes[algorithm] ? (
                <button
                  type="button"
                  className="shrink-0 text-sm text-accent hover:underline"
                  onClick={() => copy(hashes[algorithm])}
                >
                  {t("ui.copy")}
                </button>
              ) : null}
            </dd>
          </div>
        ))}
      </dl>
    </div>
  );
}
