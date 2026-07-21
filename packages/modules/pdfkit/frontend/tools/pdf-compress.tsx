"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Badge, Button } from "@omnio/ui";
import { pdfFilename } from "../../shared/pages.ts";
import { runQpdf } from "../lib/qpdf.ts";
import { downloadPdf, loadPdf, PdfDropZone, usePendingPdf, type LoadedPdf } from "../lib/pdf-file.tsx";

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/** Compress PDF — rebuild the file with tighter object streams, on your device. */
export default function PdfCompressTool() {
  const t = useTranslations("mod-pdfkit");
  const [file, setFile] = useState<LoadedPdf | null>(null);
  const [raw, setRaw] = useState<Uint8Array | null>(null);
  const [result, setResult] = useState<{ blob: Uint8Array; before: number; after: number } | null>(null);
  const [failed, setFailed] = useState<"load" | "compress" | null>(null);
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
      const out = await runQpdf(raw, (inPath, outPath) => [
        "--object-streams=generate", "--compress-streams=y", "--recompress-flate",
        "--compression-level=9", inPath, outPath,
      ]);
      setResult({ blob: out, before: raw.length, after: out.length });
    } catch {
      setFailed("compress");
    } finally {
      setBusy(false);
    }
  }

  const savings = result && result.before > 0 ? Math.round((1 - result.after / result.before) * 100) : 0;

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
              {busy ? t("ui.compressWorking") : t("ui.compressAction")}
            </Button>
          </div>
          {failed === "compress" ? <p role="alert" className="text-sm text-danger">{t("ui.compressError")}</p> : null}
          {result ? (
            <div aria-live="polite" className="flex flex-wrap items-center gap-3 rounded-lg border border-border-subtle bg-surface p-4 text-sm">
              <Badge variant="neutral">{formatBytes(result.before)}</Badge>
              <span aria-hidden="true" className="text-text-disabled">→</span>
              <Badge variant="neutral">{formatBytes(result.after)}</Badge>
              <Badge variant={savings > 0 ? "accent" : "neutral"}>
                {savings > 0 ? t("ui.compressSaved", { percent: savings }) : t("ui.compressNoGain")}
              </Badge>
              <Button type="button" size="sm" onClick={() => downloadPdf(result.blob, pdfFilename(file.name, "compressed"))}>
                {t("ui.download")}
              </Button>
            </div>
          ) : null}
          <p className="text-sm text-text-muted">{t("ui.compressNote")}</p>
          <p className="text-sm text-text-muted">{t("ui.privacy")}</p>
        </>
      ) : null}
    </div>
  );
}
