"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Badge, Button, Input, Label } from "@omnio/ui";
import { pdfFilename } from "../../shared/pages.ts";
import { downloadPdf, loadPdf, PdfDropZone, usePendingPdf, type LoadedPdf } from "../lib/pdf-file.tsx";

/** Add a blank page — insert an empty page after a chosen position. */
export default function PdfBlankTool() {
  const t = useTranslations("mod-pdfkit");
  const [file, setFile] = useState<LoadedPdf | null>(null);
  const [after, setAfter] = useState("1");
  const [failed, setFailed] = useState<"load" | "save" | null>(null);
  const [busy, setBusy] = useState(false);

  async function open(files: File[]) {
    setFailed(null);
    try {
      const loaded = await loadPdf(files[0]!);
      setFile(loaded);
      setAfter(String(loaded.pageCount));
    } catch {
      setFailed("load");
    }
  }
  usePendingPdf((files) => void open(files));

  const position = file ? Math.min(Math.max(0, Number(after) || 0), file.pageCount) : 0;

  async function run() {
    if (!file) return;
    setBusy(true);
    setFailed(null);
    try {
      // Match the surrounding page's size when there is one.
      const reference = file.doc.getPage(Math.min(position, file.pageCount - 1));
      const { width, height } = reference.getSize();
      file.doc.insertPage(position, [width, height]);
      downloadPdf(await file.doc.save(), pdfFilename(file.name, "with-blank"));
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
            <Label htmlFor="blank-after">{t("ui.blankAfter")}</Label>
            <Input id="blank-after" dir="ltr" type="number" inputMode="numeric" min={0} max={file.pageCount}
              value={after} onChange={(e) => setAfter(e.target.value)} />
            <p className="text-sm text-text-muted">{t("ui.blankHint", { count: file.pageCount })}</p>
          </div>
          {failed === "save" ? <p role="alert" className="text-sm text-danger">{t("ui.errorSave")}</p> : null}
          <div>
            <Button type="button" onClick={() => void run()} disabled={busy}>
              {busy ? t("ui.working") : t("ui.blankAction")}
            </Button>
          </div>
          <p className="text-sm text-text-muted">{t("ui.privacy")}</p>
        </>
      ) : null}
    </div>
  );
}
