"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { takePendingFiles } from "@omnio/module-sdk";
import { Badge, Button, Textarea, toast } from "@omnio/ui";
import { formatXml, minifyXml } from "../../shared/format.ts";

/** XML formatter & validator — DOMParser checks, pure formatter lays out. */
export default function XmlFormatTool() {
  const t = useTranslations("mod-xmlkit");
  const [input, setInput] = useState("");
  const [output, setOutput] = useState("");
  const [status, setStatus] = useState<"idle" | "valid" | "invalid">("idle");
  const [errorDetail, setErrorDetail] = useState("");

  useEffect(() => {
    const handed = takePendingFiles()?.[0];
    if (handed && handed.size < 5 * 1024 * 1024) {
      void handed.text().then(setInput);
    }
  }, []);

  function validate(text: string): boolean {
    const doc = new DOMParser().parseFromString(text, "application/xml");
    const parseError = doc.querySelector("parsererror");
    if (parseError) {
      setStatus("invalid");
      setErrorDetail(parseError.textContent?.split("\n")[0]?.slice(0, 160) ?? "");
      return false;
    }
    setStatus("valid");
    setErrorDetail("");
    return true;
  }

  function run(mode: "format" | "minify") {
    if (!validate(input)) {
      setOutput("");
      return;
    }
    setOutput(mode === "format" ? formatXml(input) : minifyXml(input));
  }

  return (
    <div className="flex flex-col gap-4">
      <Textarea
        dir="ltr"
        aria-label={t("ui.inputLabel")}
        className="min-h-40 font-mono text-sm"
        placeholder={t("ui.placeholder")}
        value={input}
        spellCheck={false}
        onChange={(event) => {
          setInput(event.target.value);
          setStatus("idle");
        }}
      />

      <div className="flex flex-wrap items-center gap-2">
        <Button type="button" onClick={() => run("format")} disabled={input.trim() === ""}>
          {t("ui.format")}
        </Button>
        <Button type="button" variant="secondary" onClick={() => run("minify")} disabled={input.trim() === ""}>
          {t("ui.minify")}
        </Button>
        <Button
          type="button"
          variant="secondary"
          onClick={() => validate(input)}
          disabled={input.trim() === ""}
        >
          {t("ui.validate")}
        </Button>
        {status === "valid" ? <Badge variant="accent">{t("ui.valid")}</Badge> : null}
        {status === "invalid" ? <Badge variant="neutral">{t("ui.invalid")}</Badge> : null}
      </div>
      {status === "invalid" && errorDetail ? (
        <p role="alert" dir="ltr" className="text-start font-mono text-sm text-danger">
          {errorDetail}
        </p>
      ) : null}

      {output !== "" ? (
        <div className="flex flex-col gap-2">
          <Textarea
            dir="ltr"
            aria-label={t("ui.outputLabel")}
            readOnly
            className="min-h-40 font-mono text-sm"
            value={output}
          />
          <div>
            <Button
              type="button"
              variant="secondary"
              onClick={() => {
                void navigator.clipboard.writeText(output);
                toast(t("ui.copied"));
              }}
            >
              {t("ui.copy")}
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
