"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Badge, Button } from "@omnio/ui";
import { pdfFilename } from "../../shared/pages.ts";
import { runQpdf } from "./qpdf.ts";
import { downloadPdf, loadPdf, PdfDropZone, usePendingPdf, type LoadedPdf } from "./pdf-file.tsx";

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/**
 * Shared surface for the qpdf "rewrite a clean copy" tools (linearize, repair,
 * sanitize): drop a PDF, run one qpdf pass, show the before/after size, and
 * download. The three tools differ only by their qpdf args, filename suffix, and
 * i18n key prefix, so they share this component (DRY).
 */
export function QpdfRewriteTool({
  buildArgs,
  suffix,
  keyPrefix,
}: {
  buildArgs: (inPath: string, outPath: string) => string[];
  suffix: string;
  keyPrefix: string;
}) {
  const t = useTranslations("mod-pdfkit");
  const [file, setFile] = useState<LoadedPdf | null>(null);
  const [raw, setRaw] = useState<Uint8Array | null>(null);
  const [result, setResult] = useState<{ blob: Uint8Array; before: number; after: number } | null>(null);
  const [failed, setFailed] = useState<"load" | "op" | null>(null);
  const [busy, setBusy] = useState(false);

  async function open(files: File[]) {
    setFailed(null);
    setResult(null);
    try {
      const bytes = new Uint8Array(await files[0]!.arrayBuffer());
      setRaw(bytes);
      setFile(await loadPdf(new File([bytes], files[0]!.name, { type: "application/pdf" })));
    } catch {
      setFailed("load");
    }
  }
  usePendingPdf((files) => void open(files));

  async function run() {
    if (!file || !raw) return;
    setBusy(true);
    setFailed(null);
    setResult(null);
    try {
      const out = await runQpdf(raw, buildArgs);
      setResult({ blob: out, before: raw.length, after: out.length });
    } catch {
      setFailed("op");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col gap-5">
      <PdfDropZone onFiles={(f) => void open(f)} hasFile={file !== null} />
      {failed === "load" ? <p role="alert" className="text-sm text-danger">{t("ui.errorLoad")}</p> : null}
      {file ? (
        <>
          <div className="flex flex-wrap items-center gap-2 text-sm">
            <span dir="ltr" className="max-w-60 truncate font-medium">{file.name}</span>
            <Badge variant="neutral">{t("ui.pageCount", { count: file.pageCount })}</Badge>
          </div>
          <div>
            <Button type="button" onClick={() => void run()} disabled={busy}>
              {busy ? t("ui.working") : t(`ui.${keyPrefix}Action`)}
            </Button>
          </div>
          {failed === "op" ? <p role="alert" className="text-sm text-danger">{t(`ui.${keyPrefix}Error`)}</p> : null}
          {result ? (
            <div aria-live="polite" className="flex flex-wrap items-center gap-3 rounded-lg border border-border-subtle bg-surface p-4 text-sm">
              <Badge variant="neutral">{formatBytes(result.before)}</Badge>
              <span aria-hidden="true" className="text-text-disabled">→</span>
              <Badge variant="neutral">{formatBytes(result.after)}</Badge>
              <Button type="button" size="sm" onClick={() => downloadPdf(result.blob, pdfFilename(file.name, suffix))}>
                {t("ui.download")}
              </Button>
            </div>
          ) : null}
          <p className="text-sm text-text-muted">{t(`ui.${keyPrefix}Note`)}</p>
          <p className="text-sm text-text-muted">{t("ui.privacy")}</p>
        </>
      ) : null}
    </div>
  );
}
