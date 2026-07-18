"use client";

import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { Label, Textarea } from "@omnio/ui";
import { renderMarkdown } from "../../shared/markdown.ts";

const SAMPLE = `# Hello

This is **Markdown** with *emphasis*, \`code\`, and a [link](https://omnio.dev).

- one
- two

\`\`\`
code block
\`\`\`
`;

/** Markdown preview — safe on-device rendering (raw HTML is escaped). */
export default function MarkdownPreviewTool() {
  const t = useTranslations("mod-markdown");
  const [source, setSource] = useState(SAMPLE);
  const html = useMemo(() => renderMarkdown(source), [source]);

  return (
    <div className="grid gap-4 md:grid-cols-2">
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="md-input">{t("ui.markdown")}</Label>
        <Textarea
          id="md-input"
          dir="ltr"
          className="min-h-96 font-mono text-sm"
          value={source}
          onChange={(event) => setSource(event.target.value)}
          placeholder={t("ui.placeholder")}
        />
      </div>
      <div className="flex flex-col gap-1.5">
        <Label id="md-preview-label">{t("ui.preview")}</Label>
        <div
          aria-labelledby="md-preview-label"
          className="prose-omnio min-h-96 overflow-auto rounded-lg border border-border p-4"
          // Safe: renderMarkdown escapes all HTML before emitting a fixed tag set.
          dangerouslySetInnerHTML={{ __html: html }}
        />
      </div>
    </div>
  );
}
