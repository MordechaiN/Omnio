"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { degrees, rgb, StandardFonts } from "pdf-lib";
import { Badge, Button, Input, Label } from "@omnio/ui";
import { pdfFilename } from "../../shared/pages.ts";
import { downloadPdf, loadPdf, PdfDropZone, usePendingPdf, type LoadedPdf } from "../lib/pdf-file.tsx";

/** Watermark — diagonal text across every page, baked on your device. */
export default function PdfWatermarkTool() {
  const t = useTranslations("mod-pdfkit");
  const [file, setFile] = useState<LoadedPdf | null>(null);
  const [text, setText] = useState("CONFIDENTIAL");
  const [opacity, setOpacity] = useState(15);
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

  async function apply() {
    if (!file || text.trim() === "") return;
    setBusy(true);
    setFailed(null);
    try {
      const font = await file.doc.embedFont(StandardFonts.HelveticaBold);
      for (const page of file.doc.getPages()) {
        const { width, height } = page.getSize();
        const size = Math.min(width, height) / (text.length > 12 ? 10 : 7);
        page.drawText(text, {
          x: width * 0.14,
          y: height * 0.25,
          size,
          font,
          color: rgb(0.45, 0.45, 0.45),
          opacity: opacity / 100,
          rotate: degrees(35),
        });
      }
      downloadPdf(await file.doc.save(), pdfFilename(file.name, "watermarked"));
    } catch {
      setFailed("save");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col gap-5">
      <PdfDropZone onFiles={(files) => void open(files)} hasFile={file !== null} />
      {failed === "load" ? (
        <p role="alert" className="text-sm text-danger">{t("ui.errorLoad")}</p>
      ) : null}

      {file ? (
        <>
          <div className="flex flex-wrap items-center gap-2 text-sm">
            <span dir="ltr" className="max-w-60 truncate font-medium">{file.name}</span>
            <Badge variant="neutral">{t("ui.pageCount", { count: file.pageCount })}</Badge>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="wm-pdf-text">{t("ui.wmText")}</Label>
              <Input id="wm-pdf-text" dir="ltr" value={text} onChange={(event) => setText(event.target.value)} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="wm-pdf-opacity">{t("ui.wmOpacity", { percent: opacity })}</Label>
              <input
                id="wm-pdf-opacity"
                type="range"
                min={5}
                max={60}
                value={opacity}
                onChange={(event) => setOpacity(Number(event.target.value))}
                className="accent-accent"
              />
            </div>
          </div>
          {failed === "save" ? (
            <p role="alert" className="text-sm text-danger">{t("ui.errorSave")}</p>
          ) : null}
          <div>
            <Button type="button" onClick={() => void apply()} disabled={busy || text.trim() === ""}>
              {busy ? t("ui.working") : t("ui.wmAction")}
            </Button>
          </div>
          <p className="text-sm text-text-muted">{t("ui.privacy")}</p>
        </>
      ) : null}
    </div>
  );
}
