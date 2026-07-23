"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { zip, type Zippable } from "fflate";
import { Badge, Button } from "@omnio/ui";
import { extractAttachments, type ExtractedAttachment } from "../lib/mupdf.ts";
import { loadPdf, PdfDropZone, usePendingPdf, type LoadedPdf } from "../lib/pdf-file.tsx";

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function saveBlob(bytes: Uint8Array, name: string, type: string) {
  const url = URL.createObjectURL(new Blob([bytes as BlobPart], { type }));
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = name;
  anchor.click();
  URL.revokeObjectURL(url);
}

/** Extract attachments — pull embedded files out of a PDF, on your device. */
export default function PdfExtractAttachmentsTool() {
  const t = useTranslations("mod-pdfkit");
  const [file, setFile] = useState<LoadedPdf | null>(null);
  const [raw, setRaw] = useState<Uint8Array | null>(null);
  const [items, setItems] = useState<ExtractedAttachment[] | null>(null);
  const [failed, setFailed] = useState<"load" | "extract" | null>(null);
  const [busy, setBusy] = useState(false);

  async function open(files: File[]) {
    setFailed(null);
    setItems(null);
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
    setItems(null);
    try {
      setItems(await extractAttachments(raw));
    } catch {
      setFailed("extract");
    } finally {
      setBusy(false);
    }
  }

  async function downloadZip() {
    if (!items || items.length === 0) return;
    const base = file!.name.replace(/\.pdf$/i, "") || "document";
    const payload: Zippable = {};
    items.forEach((it) => (payload[it.name] = it.bytes));
    const bytes = await new Promise<Uint8Array>((resolve, reject) =>
      zip(payload, { level: 0 }, (e, d) => (e ? reject(e) : resolve(d))),
    );
    saveBlob(bytes, `${base}-attachments.zip`, "application/zip");
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
              {busy ? t("ui.working") : t("ui.extractAttachAction")}
            </Button>
          </div>
          {failed === "extract" ? <p role="alert" className="text-sm text-danger">{t("ui.extractAttachError")}</p> : null}
          {items ? (
            items.length === 0 ? (
              <p aria-live="polite" className="text-sm text-text-muted">{t("ui.extractAttachEmpty")}</p>
            ) : (
              <div className="flex flex-col gap-3">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant="accent">{t("ui.extractAttachFound", { count: items.length })}</Badge>
                  {items.length > 1 ? (
                    <Button type="button" size="sm" onClick={() => void downloadZip()}>{t("ui.extractAttachDownloadAll")}</Button>
                  ) : null}
                </div>
                <ul className="flex flex-col gap-2">
                  {items.map((it) => (
                    <li key={it.name} className="flex items-center justify-between gap-3 rounded-lg border border-border-subtle p-3 text-sm">
                      <span className="min-w-0 truncate font-medium" dir="ltr">{it.name}</span>
                      <span className="flex shrink-0 items-center gap-2">
                        <Badge variant="neutral">{formatBytes(it.bytes.length)}</Badge>
                        <Button type="button" size="sm" variant="secondary" onClick={() => saveBlob(it.bytes, it.name, it.mimetype)}>
                          {t("ui.download")}
                        </Button>
                      </span>
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
