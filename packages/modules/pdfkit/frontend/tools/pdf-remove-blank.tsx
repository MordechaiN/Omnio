"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { PDFDocument } from "pdf-lib";
import { Badge, Button, Label } from "@omnio/ui";
import { pdfFilename } from "../../shared/pages.ts";
import { loadPdfjsDocument, renderPageToCanvas } from "../lib/pdfjs.ts";
import { downloadPdf, loadPdf, PdfDropZone, usePendingPdf, type LoadedPdf } from "../lib/pdf-file.tsx";

/**
 * Detect a blank page by rendering it small and measuring how much of it
 * differs from white. Below the threshold (percent of non-white pixels) the
 * page is treated as blank and dropped.
 */
async function isBlank(canvas: HTMLCanvasElement, thresholdPercent: number): Promise<boolean> {
  const context = canvas.getContext("2d", { willReadFrequently: true });
  if (!context) return false;
  const { data } = context.getImageData(0, 0, canvas.width, canvas.height);
  let inked = 0;
  let total = 0;
  for (let i = 0; i < data.length; i += 4 * 5) {
    total += 1;
    // Any pixel noticeably darker than white counts as ink.
    if (data[i]! < 245 || data[i + 1]! < 245 || data[i + 2]! < 245) inked += 1;
  }
  return total === 0 ? false : (inked / total) * 100 < thresholdPercent;
}

/** Remove blank pages — drop pages that are (nearly) empty. */
export default function PdfRemoveBlankTool() {
  const t = useTranslations("mod-pdfkit");
  const [file, setFile] = useState<LoadedPdf | null>(null);
  const [raw, setRaw] = useState<ArrayBuffer | null>(null);
  const [sensitivity, setSensitivity] = useState(1);
  const [failed, setFailed] = useState<"load" | "process" | "allblank" | null>(null);
  const [busy, setBusy] = useState(false);
  const [removed, setRemoved] = useState<number | null>(null);

  async function open(files: File[]) {
    setFailed(null);
    setRemoved(null);
    try {
      const bytes = await files[0]!.arrayBuffer();
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
    setRemoved(null);
    try {
      const doc = await loadPdfjsDocument(raw);
      const keep: number[] = [];
      for (let i = 1; i <= doc.numPages; i += 1) {
        const canvas = await renderPageToCanvas(doc, i, 0.4);
        if (!(await isBlank(canvas, sensitivity))) keep.push(i - 1);
      }
      if (keep.length === 0) {
        setFailed("allblank");
        return;
      }
      const out = await PDFDocument.create();
      const copied = await out.copyPages(file.doc, keep);
      for (const page of copied) out.addPage(page);
      setRemoved(file.pageCount - keep.length);
      downloadPdf(await out.save(), pdfFilename(file.name, "no-blanks"));
    } catch {
      setFailed("process");
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
          <div className="flex max-w-xs flex-col gap-1.5">
            <Label htmlFor="rb-sens">{t("ui.rbSensitivity", { percent: sensitivity })}</Label>
            <input id="rb-sens" type="range" min={0.2} max={5} step={0.2} value={sensitivity}
              onChange={(e) => setSensitivity(Number(e.target.value))} className="accent-accent" />
            <p className="text-sm text-text-muted">{t("ui.rbHint")}</p>
          </div>
          {removed !== null ? <Badge variant="accent" className="self-start">{t("ui.rbRemoved", { count: removed })}</Badge> : null}
          {failed === "process" ? <p role="alert" className="text-sm text-danger">{t("ui.p2iError")}</p> : null}
          {failed === "allblank" ? <p role="alert" className="text-sm text-text-muted">{t("ui.rbAllBlank")}</p> : null}
          <div>
            <Button type="button" onClick={() => void run()} disabled={busy}>
              {busy ? t("ui.working") : t("ui.rbAction")}
            </Button>
          </div>
          <p className="text-sm text-text-muted">{t("ui.privacy")}</p>
        </>
      ) : null}
    </div>
  );
}
