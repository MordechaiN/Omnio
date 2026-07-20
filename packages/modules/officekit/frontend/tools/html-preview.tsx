"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { takePendingFiles } from "@omnio/module-sdk";
import { Switch, Label, Textarea } from "@omnio/ui";

/**
 * HTML preview — render markup in a sandboxed iframe. Scripts are blocked by
 * default (sandbox has no allow-scripts); the toggle only adds allow-scripts,
 * still same-origin-free so nothing can reach the rest of Omnio.
 */
export default function HtmlPreviewTool() {
  const t = useTranslations("mod-officekit");
  const [html, setHtml] = useState("<h1>Hello</h1>\n<p>Edit the HTML on the left.</p>");
  const [allowScripts, setAllowScripts] = useState(false);

  useEffect(() => {
    const handed = takePendingFiles()?.[0];
    if (handed && handed.size < 2 * 1024 * 1024) void handed.text().then(setHtml);
  }, []);

  return (
    <div className="flex flex-col gap-4">
      <div className="grid gap-4 lg:grid-cols-2">
        <Textarea
          dir="ltr"
          aria-label={t("ui.htmlInput")}
          className="min-h-72 font-mono text-sm"
          value={html}
          spellCheck={false}
          onChange={(event) => setHtml(event.target.value)}
        />
        <iframe
          title={t("ui.htmlPreviewTitle")}
          srcDoc={html}
          sandbox={allowScripts ? "allow-scripts" : ""}
          className="min-h-72 w-full rounded-lg border border-border-subtle bg-white"
        />
      </div>
      <div className="flex items-center gap-2">
        <Switch id="html-scripts" checked={allowScripts} onCheckedChange={setAllowScripts} />
        <Label htmlFor="html-scripts">{t("ui.htmlAllowScripts")}</Label>
      </div>
      <p className="text-sm text-text-muted">{t("ui.privacy")}</p>
    </div>
  );
}
