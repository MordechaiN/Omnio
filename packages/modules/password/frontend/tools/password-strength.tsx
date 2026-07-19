"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Input, Label, Progress } from "@omnio/ui";
import { buildAlphabet, entropyBits } from "../../shared/password.ts";

/** Rough crack-time at 10 billion guesses/second (offline GPU attack). */
function crackSeconds(bits: number): number {
  return 2 ** (bits - 1) / 1e10;
}

function classify(password: string) {
  return {
    length: password.length,
    lowercase: /[a-z]/.test(password),
    uppercase: /[A-Z]/.test(password),
    digits: /\d/.test(password),
    symbols: /[^a-zA-Z0-9]/.test(password),
  };
}

/**
 * Password strength — entropy math on this device; the password is never
 * sent anywhere and never stored.
 */
export default function PasswordStrengthTool() {
  const t = useTranslations("mod-password");
  const [password, setPassword] = useState("");

  const classes = classify(password);
  const alphabetSize = buildAlphabet({
    length: 0,
    lowercase: classes.lowercase,
    uppercase: classes.uppercase,
    digits: classes.digits,
    symbols: classes.symbols,
    avoidAmbiguous: false,
  }).length;
  const bits = entropyBits(Math.max(1, alphabetSize), password.length);
  const seconds = crackSeconds(bits);

  const level = bits >= 90 ? 4 : bits >= 70 ? 3 : bits >= 50 ? 2 : bits >= 30 ? 1 : 0;
  const levelKeys = ["veryWeak", "weak", "fair", "strong", "excellent"] as const;

  function crackLabel(): string {
    if (password === "") return "—";
    if (seconds < 1) return t("ui.crackInstant");
    if (seconds < 3600) return t("ui.crackMinutes");
    if (seconds < 86400 * 30) return t("ui.crackDays");
    if (seconds < 86400 * 365 * 100) return t("ui.crackYears");
    return t("ui.crackCenturies");
  }

  return (
    <div className="flex max-w-xl flex-col gap-5">
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="ps-input">{t("ui.strengthLabel")}</Label>
        <Input
          id="ps-input"
          dir="ltr"
          type="text"
          className="font-mono"
          value={password}
          spellCheck={false}
          autoComplete="off"
          placeholder={t("ui.strengthPlaceholder")}
          onChange={(event) => setPassword(event.target.value)}
        />
        <p className="text-sm text-text-muted">{t("ui.strengthPrivacy")}</p>
      </div>

      {password !== "" ? (
        <div aria-live="polite" className="flex flex-col gap-4 rounded-xl border border-border-subtle bg-surface p-4">
          <div className="flex items-center justify-between gap-4">
            <span className="text-sm font-medium">{t(`ui.level.${levelKeys[level]}`)}</span>
            <span dir="ltr" className="text-sm tabular-nums text-text-muted">
              {t("ui.entropy", { bits })}
            </span>
          </div>
          <Progress value={Math.min(100, (bits / 100) * 100)} aria-label={t("ui.strengthLabel")} />
          <dl className="grid gap-x-6 gap-y-1 sm:grid-cols-[auto_1fr]">
            <dt className="text-sm text-text-muted">{t("ui.crackTime")}</dt>
            <dd className="text-sm">{crackLabel()}</dd>
            <dt className="text-sm text-text-muted">{t("ui.characterMix")}</dt>
            <dd className="text-sm">
              {(["lowercase", "uppercase", "digits", "symbols"] as const)
                .filter((key) => classes[key])
                .map((key) => t(`ui.${key}`))
                .join(" · ") || "—"}
            </dd>
          </dl>
          {level < 3 ? (
            <p className="text-sm text-text-muted">{t("ui.strengthAdvice")}</p>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
