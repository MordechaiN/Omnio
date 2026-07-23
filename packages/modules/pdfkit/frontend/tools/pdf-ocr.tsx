"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Badge, Button, Progress } from "@omnio/ui";
import { pdfFilename } from "../../shared/pages.ts";
import { ocrToSearchablePdf, type OcrResult } from "../lib/ocr.ts";
import { downloadPdf, loadPdf, PdfDropZone, usePendingPdf, type LoadedPdf } from "../lib/pdf-file.tsx";

/** OCR — make a scanned PDF searchable by adding an invisible text layer. */
export default function PdfOcrTool() {
  const t = useTranslations("mod-pdfkit");
  const [file, setFile] = useState<LoadedPdf | null>(null);
  const [raw, setRaw] = useState<Uint8Array | null>(null);
  const [result, setResult] = useState<OcrResult | null>(null);
  const [failed, setFailed] = useState<"load" | "ocr" | null>(null);
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState<{ page: number; total: number } | null>(null);

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
    setProgress({ page: 0, total: file.pageCount });
    try {
      const res = await ocrToSearchablePdf(raw, (page, total) => setProgress({ page, total }));
      setResult(res);
    } catch {
      setFailed("ocr");
    } finally {
      setBusy(false);
      setProgress(null);
    }
  }

  const pct = progress && progress.total > 0 ? Math.round((progress.page / progress.total) * 100) : 0;

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
          <p className="text-sm text-text-muted">{t("ui.ocrIntro")}</p>
          <div>
            <Button type="button" onClick={() => void run()} disabled={busy}>
              {busy ? t("ui.ocrWorking") : t("ui.ocrAction")}
            </Button>
          </div>
          {busy && progress ? (
            <div className="flex flex-col gap-1" aria-live="polite">
              <Progress value={pct} aria-label={t("ui.ocrProgress", { page: progress.page, total: progress.total })} />
              <span className="text-xs text-text-muted">{t("ui.ocrProgress", { page: progress.page, total: progress.total })}</span>
            </div>
          ) : null}
          {failed === "ocr" ? <p role="alert" className="text-sm text-danger">{t("ui.ocrError")}</p> : null}
          {result ? (
            <div aria-live="polite" className="flex flex-col gap-3 rounded-lg border border-border-subtle bg-surface p-4">
              <div className="flex flex-wrap items-center gap-2 text-sm">
                <Badge variant={result.wordCount > 0 ? "accent" : "neutral"}>{t("ui.ocrWords", { count: result.wordCount })}</Badge>
                <Badge variant="neutral">{t("ui.ocrConfidence", { percent: result.confidence })}</Badge>
              </div>
              {result.wordCount === 0 ? (
                <p className="text-sm text-text-muted">{t("ui.ocrNoText")}</p>
              ) : null}
              <div>
                <Button type="button" size="sm" onClick={() => downloadPdf(result.pdf, pdfFilename(file.name, "searchable"))}>
                  {t("ui.download")}
                </Button>
              </div>
            </div>
          ) : null}
          <p className="text-sm text-text-muted">{t("ui.privacy")}</p>
        </>
      ) : null}
    </div>
  );
}
