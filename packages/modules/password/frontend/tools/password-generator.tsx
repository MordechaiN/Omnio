"use client";

import { useCallback, useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Button, Checkbox, Label, Switch } from "@omnio/ui";
import {
  buildAlphabet,
  entropyBits,
  generatePassphrase,
  generatePassword,
  type PasswordOptions,
} from "../../shared/password.ts";
import { WORDS } from "../../shared/words.ts";

const CLASSES = ["lowercase", "uppercase", "digits", "symbols"] as const;
type CharClass = (typeof CLASSES)[number];

/** Password + passphrase generator — cryptographically random, on your device. */
export default function PasswordGeneratorTool() {
  const t = useTranslations("mod-password");
  const [mode, setMode] = useState<"password" | "passphrase">("password");
  const [length, setLength] = useState(20);
  const [wordCount, setWordCount] = useState(5);
  const [classes, setClasses] = useState<Record<CharClass, boolean>>({
    lowercase: true,
    uppercase: true,
    digits: true,
    symbols: true,
  });
  const [avoidAmbiguous, setAvoidAmbiguous] = useState(false);
  const [value, setValue] = useState("");

  const options: PasswordOptions = { length, ...classes, avoidAmbiguous };

  const regenerate = useCallback(() => {
    setValue(
      mode === "password"
        ? generatePassword(options)
        : generatePassphrase(WORDS, wordCount),
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, length, wordCount, classes.lowercase, classes.uppercase, classes.digits, classes.symbols, avoidAmbiguous]);

  useEffect(() => {
    regenerate();
  }, [regenerate]);

  const bits =
    mode === "password"
      ? entropyBits(buildAlphabet(options).length, length)
      : entropyBits(WORDS.length, wordCount);

  return (
    <div className="flex flex-col gap-5">
      <div className="inline-flex rounded-lg border border-border p-0.5" role="tablist">
        {(["password", "passphrase"] as const).map((value) => (
          <button
            key={value}
            type="button"
            role="tab"
            aria-selected={mode === value}
            onClick={() => setMode(value)}
            className={`rounded-md px-3 py-1 text-sm transition-colors ${
              mode === value ? "bg-accent text-accent-fg" : "text-text-muted"
            }`}
          >
            {t(`ui.${value}`)}
          </button>
        ))}
      </div>

      <div className="flex items-center gap-2 rounded-lg border border-border bg-surface-raised p-3">
        <output
          dir="ltr"
          className="min-w-0 flex-1 truncate font-mono text-lg"
          aria-label={t("ui.result")}
        >
          {value || "—"}
        </output>
        <Button
          type="button"
          size="sm"
          variant="ghost"
          onClick={() => {
            void navigator.clipboard.writeText(value);
          }}
        >
          {t("ui.copy")}
        </Button>
        <Button type="button" size="sm" onClick={regenerate}>
          {t("ui.regenerate")}
        </Button>
      </div>

      <p className="text-sm text-text-muted">{t("ui.entropy", { bits })}</p>

      {mode === "password" ? (
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="pw-length">{t("ui.length", { length })}</Label>
            <input
              id="pw-length"
              type="range"
              min={8}
              max={64}
              value={length}
              onChange={(event) => setLength(Number(event.target.value))}
              className="accent-accent"
            />
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {CLASSES.map((cls) => (
              <label key={cls} className="flex items-center gap-2 text-sm">
                <Checkbox
                  checked={classes[cls]}
                  onCheckedChange={(checked) =>
                    setClasses((prev) => ({ ...prev, [cls]: checked === true }))
                  }
                />
                {t(`ui.${cls}`)}
              </label>
            ))}
          </div>
          <div className="flex items-center gap-2">
            <Switch
              id="pw-ambiguous"
              checked={avoidAmbiguous}
              onCheckedChange={setAvoidAmbiguous}
            />
            <Label htmlFor="pw-ambiguous">{t("ui.avoidAmbiguous")}</Label>
          </div>
        </div>
      ) : (
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="pp-count">{t("ui.words", { count: wordCount })}</Label>
          <input
            id="pp-count"
            type="range"
            min={3}
            max={10}
            value={wordCount}
            onChange={(event) => setWordCount(Number(event.target.value))}
            className="accent-accent"
          />
        </div>
      )}
    </div>
  );
}
