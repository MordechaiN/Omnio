"use client";

import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { Alert, AlertDescription, Button, Input, Label } from "@omnio/ui";
import { fromRoman, toRoman } from "../../shared/roman.ts";

type Mode = "toRoman" | "fromRoman";

/** Roman numeral converter — on your device. */
export default function RomanNumeralTool() {
  const t = useTranslations("mod-roman");
  const [mode, setMode] = useState<Mode>("toRoman");
  const [input, setInput] = useState("");

  const result = useMemo(
    () => (mode === "toRoman" ? toRoman(Number(input)) : fromRoman(input)),
    [mode, input],
  );

  const modes: Mode[] = ["toRoman", "fromRoman"];
  const show = input.trim() !== "";

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap gap-2">
        {modes.map((m) => (
          <Button
            key={m}
            type="button"
            size="sm"
            variant={mode === m ? "primary" : "secondary"}
            onClick={() => {
              setMode(m);
              setInput("");
            }}
          >
            {t(`ui.${m}`)}
          </Button>
        ))}
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="roman-input">{mode === "toRoman" ? t("ui.number") : t("ui.numeral")}</Label>
        <Input
          id="roman-input"
          dir="ltr"
          inputMode={mode === "toRoman" ? "numeric" : "text"}
          className="font-mono text-lg"
          value={input}
          onChange={(event) => setInput(event.target.value)}
          placeholder={mode === "toRoman" ? "1994" : "MCMXCIV"}
        />
      </div>

      {show && result.error ? (
        <Alert variant="warning">
          <AlertDescription>{result.error}</AlertDescription>
        </Alert>
      ) : show && result.value !== undefined ? (
        <div className="rounded-lg border border-border p-4 text-center text-3xl font-semibold" dir="ltr">
          {result.value}
        </div>
      ) : null}
    </div>
  );
}
