"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { PDFDocument } from "pdf-lib";
import { Badge, Button, Input, Label } from "@omnio/ui";
import { parsePageRanges, pdfFilename } from "../../shared/pages.ts";
import { downloadPdf, loadPdf, PdfDropZone, usePendingPdf, type LoadedPdf } from "../lib/pdf-file.tsx";

/** Split — extract a page selection ("1-3,7,9-") into a new PDF. */
export default function PdfSplitTool() {
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

  const pages = file ? parsePageRanges(range, file.pageCount) : null;

  async function extract() {
    if (!file || !pages) return;
    setBusy(true);
    setFailed(null);
    try {
      const output = await PDFDocument.create();
      const copied = await output.copyPages(file.doc, pages);
      for (const page of copied) output.addPage(page);
      downloadPdf(await output.save(), pdfFilename(file.name, "pages"));
    } catch {
      setFailed("save");
    } finally {
      setBusy(false);
    }
  }

  usePendingPdf((files) => void open(files));

  return (
    <div className="flex flex-col gap-5">
      <PdfDropZone onFiles={(files) => void open(files)} hasFile={file !== null} />
      {failed === "load" ? (
        <p role="alert" className="text-sm text-danger">
          {t("ui.errorLoad")}
        </p>
      ) : null}

      {file ? (
        <>
          <div className="flex flex-wrap items-center gap-2 text-sm">
            <span dir="ltr" className="max-w-60 truncate font-medium">
              {file.name}
            </span>
            <Badge variant="neutral">{t("ui.pageCount", { count: file.pageCount })}</Badge>
          </div>

          <div className="flex max-w-md flex-col gap-1.5">
            <Label htmlFor="split-range">{t("ui.rangeLabel")}</Label>
            <Input
              id="split-range"
              dir="ltr"
              className="font-mono"
              placeholder="1-3, 7, 12-"
              value={range}
              spellCheck={false}
              autoComplete="off"
              aria-invalid={range.trim() !== "" && pages === null ? true : undefined}
              onChange={(event) => setRange(event.target.value)}
            />
            <p className="text-sm text-text-muted">
              {t("ui.rangeHint", { count: file.pageCount })}
            </p>
            {range.trim() !== "" && pages === null ? (
              <p role="alert" className="text-sm text-danger">
                {t("ui.rangeInvalid")}
              </p>
            ) : null}
          </div>

          {failed === "save" ? (
            <p role="alert" className="text-sm text-danger">
              {t("ui.errorSave")}
            </p>
          ) : null}

          <div>
            <Button type="button" onClick={() => void extract()} disabled={!pages || busy}>
              {busy
                ? t("ui.working")
                : t("ui.splitAction", { count: pages?.length ?? 0 })}
            </Button>
          </div>
          <p className="text-sm text-text-muted">{t("ui.privacy")}</p>
        </>
      ) : null}
    </div>
  );
}
