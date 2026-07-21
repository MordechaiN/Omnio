"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Badge, Button } from "@omnio/ui";
import { pdfFilename } from "../../shared/pages.ts";
import { downloadPdf, loadPdf, PdfDropZone, usePendingPdf, type LoadedPdf } from "../lib/pdf-file.tsx";

/** Flatten a form — bake filled fields into the page so they can't be edited. */
export default function PdfFlattenTool() {
  const t = useTranslations("mod-pdfkit");
  const [file, setFile] = useState<LoadedPdf | null>(null);
  const [fieldCount, setFieldCount] = useState(0);
  const [failed, setFailed] = useState<"load" | "save" | "nofields" | null>(null);
  const [busy, setBusy] = useState(false);

  async function open(files: File[]) {
    setFailed(null);
    try {
      const loaded = await loadPdf(files[0]!);
      setFile(loaded);
      setFieldCount(loaded.doc.getForm().getFields().length);
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
      const form = file.doc.getForm();
      if (form.getFields().length === 0) {
        setFailed("nofields");
        return;
      }
      form.flatten();
      downloadPdf(await file.doc.save(), pdfFilename(file.name, "flattened"));
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
            <Badge variant={fieldCount > 0 ? "accent" : "neutral"}>{t("ui.flattenFields", { count: fieldCount })}</Badge>
          </div>
          {failed === "save" ? <p role="alert" className="text-sm text-danger">{t("ui.errorSave")}</p> : null}
          {failed === "nofields" ? <p role="alert" className="text-sm text-text-muted">{t("ui.flattenNone")}</p> : null}
          <div>
            <Button type="button" onClick={() => void run()} disabled={busy || fieldCount === 0}>
              {busy ? t("ui.working") : t("ui.flattenAction")}
            </Button>
          </div>
          <p className="text-sm text-text-muted">{t("ui.flattenNote")}</p>
          <p className="text-sm text-text-muted">{t("ui.privacy")}</p>
        </>
      ) : null}
    </div>
  );
}
