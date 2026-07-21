"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { PDFDocument } from "pdf-lib";
import { Badge, Button } from "@omnio/ui";
import { reversedOrder } from "../../shared/operations.ts";
import { pdfFilename } from "../../shared/pages.ts";
import { downloadPdf, loadPdf, PdfDropZone, usePendingPdf, type LoadedPdf } from "../lib/pdf-file.tsx";

/** Reverse pages — flip a document back to front. */
export default function PdfReverseTool() {
  const t = useTranslations("mod-pdfkit");
  const [file, setFile] = useState<LoadedPdf | null>(null);
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
      const out = await PDFDocument.create();
      const copied = await out.copyPages(file.doc, reversedOrder(file.pageCount));
      for (const page of copied) out.addPage(page);
      downloadPdf(await out.save(), pdfFilename(file.name, "reversed"));
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
          {failed === "save" ? <p role="alert" className="text-sm text-danger">{t("ui.errorSave")}</p> : null}
          <div>
            <Button type="button" onClick={() => void run()} disabled={busy}>
              {busy ? t("ui.working") : t("ui.reverseAction")}
            </Button>
          </div>
          <p className="text-sm text-text-muted">{t("ui.privacy")}</p>
        </>
      ) : null}
    </div>
  );
}
