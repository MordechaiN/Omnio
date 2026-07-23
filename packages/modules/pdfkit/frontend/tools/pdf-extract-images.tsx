"use client";

import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { zip, type Zippable } from "fflate";
import { Badge, Button } from "@omnio/ui";
import { extractImages, type ExtractedImage } from "../lib/mupdf.ts";
import { loadPdf, PdfDropZone, usePendingPdf, type LoadedPdf } from "../lib/pdf-file.tsx";

/** Extract embedded images — pull every picture out of a PDF, on your device. */
export default function PdfExtractImagesTool() {
  const t = useTranslations("mod-pdfkit");
  const [file, setFile] = useState<LoadedPdf | null>(null);
  const [raw, setRaw] = useState<Uint8Array | null>(null);
  const [images, setImages] = useState<ExtractedImage[] | null>(null);
  const [failed, setFailed] = useState<"load" | "extract" | null>(null);
  const [busy, setBusy] = useState(false);

  const previews = useMemo(
    () => (images ?? []).map((img) => ({ img, url: URL.createObjectURL(new Blob([img.bytes as BlobPart], { type: "image/png" })) })),
    [images],
  );

  async function open(files: File[]) {
    setFailed(null);
    setImages(null);
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
    setImages(null);
    try {
      setImages(await extractImages(raw, file.name));
    } catch {
      setFailed("extract");
    } finally {
      setBusy(false);
    }
  }

  async function downloadZip() {
    if (!images || images.length === 0) return;
    const base = file!.name.replace(/\.pdf$/i, "") || "document";
    const payload: Zippable = {};
    images.forEach((img) => (payload[img.name] = img.bytes));
    const bytes = await new Promise<Uint8Array>((resolve, reject) =>
      zip(payload, { level: 0 }, (e, d) => (e ? reject(e) : resolve(d))),
    );
    const url = URL.createObjectURL(new Blob([bytes as BlobPart], { type: "application/zip" }));
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `${base}-images.zip`;
    anchor.click();
    URL.revokeObjectURL(url);
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
              {busy ? t("ui.working") : t("ui.extractImagesAction")}
            </Button>
          </div>
          {failed === "extract" ? <p role="alert" className="text-sm text-danger">{t("ui.extractImagesError")}</p> : null}
          {images ? (
            images.length === 0 ? (
              <p aria-live="polite" className="text-sm text-text-muted">{t("ui.extractImagesEmpty")}</p>
            ) : (
              <div className="flex flex-col gap-3">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant="accent">{t("ui.extractImagesFound", { count: images.length })}</Badge>
                  <Button type="button" size="sm" onClick={() => void downloadZip()}>{t("ui.extractImagesDownloadAll")}</Button>
                </div>
                <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                  {previews.map(({ img, url }) => (
                    <li key={img.name} className="flex flex-col gap-1 rounded-lg border border-border-subtle p-2">
                      <img src={url} alt={img.name} className="h-28 w-full rounded object-contain" />
                      <span className="truncate text-xs text-text-muted" dir="ltr">{img.width}×{img.height}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )
          ) : null}
          <p className="text-sm text-text-muted">{t("ui.privacy")}</p>
        </>
      ) : null}
    </div>
  );
}
