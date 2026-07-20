"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { takePendingFiles } from "@omnio/module-sdk";
import { Badge, Button, Textarea, toast } from "@omnio/ui";
import { optimizeSvg } from "../../shared/svg.ts";

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  return `${(bytes / 1024).toFixed(1)} KB`;
}

/** SVG optimizer — safe cleanups only (comments, metadata, editor cruft). */
export default function SvgOptimizeTool() {
  const t = useTranslations("mod-imagekit");
  const [input, setInput] = useState("");

  useEffect(() => {
    const handed = takePendingFiles()?.[0];
    if (handed && handed.size < 5 * 1024 * 1024) void handed.text().then(setInput);
  }, []);

  const output = input.trim() === "" ? "" : optimizeSvg(input);
  const inputBytes = new Blob([input]).size;
  const outputBytes = new Blob([output]).size;
  const savings = inputBytes > 0 ? Math.round((1 - outputBytes / inputBytes) * 100) : 0;

  function download() {
    const url = URL.createObjectURL(new Blob([output], { type: "image/svg+xml" }));
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "optimized.svg";
    anchor.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="flex flex-col gap-4">
      <Textarea
        dir="ltr"
        aria-label={t("ui.svgInput")}
        className="min-h-40 font-mono text-xs"
        placeholder="<svg …>"
        value={input}
        spellCheck={false}
        onChange={(event) => setInput(event.target.value)}
      />

      {output !== "" ? (
        <>
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="neutral">{formatBytes(inputBytes)}</Badge>
            <span aria-hidden="true" className="text-text-disabled">→</span>
            <Badge variant="neutral">{formatBytes(outputBytes)}</Badge>
            {savings > 0 ? <Badge variant="accent">−{savings}%</Badge> : null}
          </div>
          {/* Live render check via <img> — draws the SVG but never runs its scripts. */}
          <div className="flex max-h-40 items-center justify-center overflow-hidden rounded-lg border border-border-subtle bg-white p-3">
            <img
              src={`data:image/svg+xml;utf8,${encodeURIComponent(output)}`}
              alt=""
              className="max-h-32 w-auto"
            />
          </div>
          <div className="flex items-center gap-2">
            <Button type="button" onClick={download}>{t("ui.svgDownload")}</Button>
            <Button
              type="button"
              variant="secondary"
              onClick={() => {
                void navigator.clipboard.writeText(output);
                toast(t("ui.copied", { value: "SVG" }));
              }}
            >
              {t("ui.copy")}
            </Button>
          </div>
          <p className="text-sm text-text-muted">{t("ui.svgNote")}</p>
        </>
      ) : null}
    </div>
  );
}
