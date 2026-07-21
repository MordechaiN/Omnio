"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { PDFDocument } from "pdf-lib";
import { Badge, Button, Input, Label } from "@omnio/ui";
import { duplicatedOrder } from "../../shared/operations.ts";
import { parsePageRanges, pdfFilename } from "../../shared/pages.ts";
import { downloadPdf, loadPdf, PdfDropZone, usePendingPdf, type LoadedPdf } from "../lib/pdf-file.tsx";

/** Duplicate pages — repeat chosen pages in place. */
export default function PdfDuplicateTool() {
  const t = useTranslations("mod-pdfkit");
  const [file, setFile] = useState<LoadedPdf | null>(null);
  const [range, setRange] = useState("");
  const [failed, setFailed] = useState<"load" | "save" | null>(null);
  const [busy, setBusy] = useState(false);

  async function open(files: File[]) {
    setFailed(null);
    try {
      setFile(await loadPdf(files[0]!));
      setRange("");
    } catch {
      setFailed("load");
    }
  }
  usePendingPdf((files) => void open(files));

  const selected = file && range.trim() !== "" ? parsePageRanges(range, file.pageCount) : null;

  async function run() {
    if (!file || !selected) return;
    setBusy(true);
    setFailed(null);
    try {
      const order = duplicatedOrder(file.pageCount, new Set(selected));
      const out = await PDFDocument.create();
      const copied = await out.copyPages(file.doc, order);
      for (const page of copied) out.addPage(page);
      downloadPdf(await out.save(), pdfFilename(file.name, "duplicated"));
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
          <div className="flex max-w-md flex-col gap-1.5">
            <Label htmlFor="dup-range">{t("ui.dupLabel")}</Label>
            <Input id="dup-range" dir="ltr" className="font-mono" placeholder="1, 3-4" value={range}
              spellCheck={false} autoComplete="off"
              aria-invalid={range.trim() !== "" && selected === null ? true : undefined}
              onChange={(e) => setRange(e.target.value)} />
            <p className="text-sm text-text-muted">{t("ui.rangeHint", { count: file.pageCount })}</p>
            {range.trim() !== "" && selected === null ? <p role="alert" className="text-sm text-danger">{t("ui.rangeInvalid")}</p> : null}
          </div>
          {failed === "save" ? <p role="alert" className="text-sm text-danger">{t("ui.errorSave")}</p> : null}
          <div>
            <Button type="button" onClick={() => void run()} disabled={!selected || busy}>
              {busy ? t("ui.working") : t("ui.dupAction", { count: selected?.length ?? 0 })}
            </Button>
          </div>
          <p className="text-sm text-text-muted">{t("ui.privacy")}</p>
        </>
      ) : null}
    </div>
  );
}
