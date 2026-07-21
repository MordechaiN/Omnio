"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Badge, Button, Label } from "@omnio/ui";
import { clampMargin } from "../../shared/operations.ts";
import { pdfFilename } from "../../shared/pages.ts";
import { downloadPdf, loadPdf, PdfDropZone, usePendingPdf, type LoadedPdf } from "../lib/pdf-file.tsx";

/** Crop pages — trim an even margin off every page via the crop box. */
export default function PdfCropTool() {
  const t = useTranslations("mod-pdfkit");
  const [file, setFile] = useState<LoadedPdf | null>(null);
  const [margin, setMargin] = useState(5);
  const [failed, setFailed] = useState<"load" | "save" | null>(null);
  const [busy, setBusy] = useState(false);

  async function open(files: File[]) {
    setFailed(null);
    try {
      setFile(await loadPdf(files[0]!));
    } catch {
      setFailed("load");
    }
  }
  usePendingPdf((files) => void open(files));

  async function run() {
    if (!file) return;
    setBusy(true);
    setFailed(null);
    try {
      const frac = clampMargin(margin / 100);
      for (const page of file.doc.getPages()) {
        const { width, height } = page.getSize();
        const mx = width * frac;
        const my = height * frac;
        // Crop box relative to the page's existing media box origin.
        page.setCropBox(mx, my, width - 2 * mx, height - 2 * my);
      }
      downloadPdf(await file.doc.save(), pdfFilename(file.name, "cropped"));
    } catch {
      setFailed("save");
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
            <Label htmlFor="crop-margin">{t("ui.cropMargin", { percent: margin })}</Label>
            <input id="crop-margin" type="range" min={0} max={40} value={margin}
              onChange={(e) => setMargin(Number(e.target.value))} className="accent-accent" />
          </div>
          {failed === "save" ? <p role="alert" className="text-sm text-danger">{t("ui.errorSave")}</p> : null}
          <div>
            <Button type="button" onClick={() => void run()} disabled={busy || margin === 0}>
              {busy ? t("ui.working") : t("ui.cropAction")}
            </Button>
          </div>
          <p className="text-sm text-text-muted">{t("ui.cropNote")}</p>
          <p className="text-sm text-text-muted">{t("ui.privacy")}</p>
        </>
      ) : null}
    </div>
  );
}
