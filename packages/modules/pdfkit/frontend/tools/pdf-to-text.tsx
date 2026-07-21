"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Badge, Button, Textarea, toast } from "@omnio/ui";
import { loadPdfjsDocument } from "../lib/pdfjs.ts";
import { loadPdf, PdfDropZone, usePendingPdf, type LoadedPdf } from "../lib/pdf-file.tsx";

interface TextItem {
  str: string;
  hasEOL?: boolean;
}

/** PDF to text — pull the readable text out of a PDF (not scanned images). */
export default function PdfToTextTool() {
  const t = useTranslations("mod-pdfkit");
  const [file, setFile] = useState<LoadedPdf | null>(null);
  const [raw, setRaw] = useState<ArrayBuffer | null>(null);
  const [text, setText] = useState("");
  const [failed, setFailed] = useState<"load" | "extract" | null>(null);
  const [busy, setBusy] = useState(false);

  async function open(files: File[]) {
    setFailed(null);
    setText("");
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
    if (!raw) return;
    setBusy(true);
    setFailed(null);
    try {
      const doc = await loadPdfjsDocument(raw);
      const parts: string[] = [];
      for (let i = 1; i <= doc.numPages; i += 1) {
        const page = await doc.getPage(i);
        const content = await page.getTextContent();
        const line = (content.items as TextItem[])
          .map((item) => item.str + (item.hasEOL ? "\n" : ""))
          .join("");
        parts.push(line.trim());
      }
      setText(parts.join("\n\n").trim());
    } catch {
      setFailed("extract");
    } finally {
      setBusy(false);
    }
  }

  function download() {
    if (!file) return;
    const url = URL.createObjectURL(new Blob([text], { type: "text/plain" }));
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `${file.name.replace(/\.pdf$/i, "")}.txt`;
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
              {busy ? t("ui.working") : t("ui.p2tAction")}
            </Button>
          </div>
          {failed === "extract" ? <p role="alert" className="text-sm text-danger">{t("ui.p2tError")}</p> : null}
          {text !== "" ? (
            <div className="flex flex-col gap-2">
              <Textarea dir="auto" readOnly className="min-h-48 font-mono text-sm" value={text} aria-label={t("ui.p2tResult")} />
              <div className="flex items-center gap-2">
                <Button type="button" onClick={download}>{t("ui.p2tDownload")}</Button>
                <Button type="button" variant="secondary" onClick={() => { void navigator.clipboard.writeText(text); toast(t("ui.p2tCopied")); }}>
                  {t("ui.p2tCopy")}
                </Button>
              </div>
            </div>
          ) : !busy ? (
            <p className="text-sm text-text-muted">{t("ui.p2tHint")}</p>
          ) : null}
          <p className="text-sm text-text-muted">{t("ui.privacy")}</p>
        </>
      ) : null}
    </div>
  );
}
