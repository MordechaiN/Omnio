"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { zip, type Zippable } from "fflate";
import { Badge, Button, Label, Progress, Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@omnio/ui";
import { loadPdfjsDocument, renderPageToCanvas } from "../lib/pdfjs.ts";
import { loadPdf, PdfDropZone, usePendingPdf, type LoadedPdf } from "../lib/pdf-file.tsx";

type Format = "image/png" | "image/jpeg";
const SCALES: Record<string, number> = { "1": 1, "2": 2, "3": 3 };

/** PDF to images — render each page to a PNG or JPEG, download as a ZIP. */
export default function PdfToImagesTool() {
  const t = useTranslations("mod-pdfkit");
  const [file, setFile] = useState<LoadedPdf | null>(null);
  const [raw, setRaw] = useState<ArrayBuffer | null>(null);
  const [format, setFormat] = useState<Format>("image/png");
  const [scaleKey, setScaleKey] = useState("2");
  const [failed, setFailed] = useState<"load" | "render" | null>(null);
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState(0);

  async function open(files: File[]) {
    setFailed(null);
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
    setProgress(0);
    try {
      const doc = await loadPdfjsDocument(raw);
      const payload: Zippable = {};
      const ext = format === "image/png" ? "png" : "jpg";
      const base = file.name.replace(/\.pdf$/i, "") || "page";
      for (let i = 1; i <= doc.numPages; i += 1) {
        const canvas = await renderPageToCanvas(doc, i, SCALES[scaleKey]!);
        const blob = await new Promise<Blob | null>((r) => canvas.toBlob(r, format, 0.92));
        if (blob) {
          payload[`${base}-${String(i).padStart(3, "0")}.${ext}`] = new Uint8Array(await blob.arrayBuffer());
        }
        setProgress(Math.round((i / doc.numPages) * 100));
      }
      const bytes = await new Promise<Uint8Array>((resolve, reject) =>
        zip(payload, { level: 0 }, (e, d) => (e ? reject(e) : resolve(d))),
      );
      const url = URL.createObjectURL(new Blob([bytes as BlobPart], { type: "application/zip" }));
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = `${base}-images.zip`;
      anchor.click();
      URL.revokeObjectURL(url);
    } catch {
      setFailed("render");
    } finally {
      setBusy(false);
      setProgress(0);
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
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="p2i-format">{t("ui.p2iFormat")}</Label>
              <Select value={format} onValueChange={(v) => setFormat(v as Format)}>
                <SelectTrigger id="p2i-format"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="image/png">PNG</SelectItem>
                  <SelectItem value="image/jpeg">JPEG</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="p2i-scale">{t("ui.p2iQuality")}</Label>
              <Select value={scaleKey} onValueChange={setScaleKey}>
                <SelectTrigger id="p2i-scale"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">{t("ui.p2iScreen")}</SelectItem>
                  <SelectItem value="2">{t("ui.p2iHigh")}</SelectItem>
                  <SelectItem value="3">{t("ui.p2iPrint")}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          {busy ? <Progress value={progress} aria-label={t("ui.working")} /> : null}
          {failed === "render" ? <p role="alert" className="text-sm text-danger">{t("ui.p2iError")}</p> : null}
          <div>
            <Button type="button" onClick={() => void run()} disabled={busy}>
              {busy ? t("ui.working") : t("ui.p2iAction", { count: file.pageCount })}
            </Button>
          </div>
          <p className="text-sm text-text-muted">{t("ui.privacy")}</p>
        </>
      ) : null}
    </div>
  );
}
