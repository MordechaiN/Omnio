"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { PDFDocument } from "pdf-lib";
import { Badge, Button, IconButton } from "@omnio/ui";
import { ArrowDown, ArrowUp, X } from "lucide-react";
import { downloadPdf, loadPdf, PdfDropZone, usePendingPdf, type LoadedPdf } from "../lib/pdf-file.tsx";

/** Merge PDFs — order the list, then combine into one document. */
export default function PdfMergeTool() {
  const t = useTranslations("mod-pdfkit");
  const [files, setFiles] = useState<LoadedPdf[]>([]);
  const [failed, setFailed] = useState(false);
  const [busy, setBusy] = useState(false);

  async function add(incoming: File[]) {
    setFailed(false);
    for (const file of incoming) {
      try {
        const loaded = await loadPdf(file);
        setFiles((previous) => [...previous, loaded]);
      } catch {
        setFailed(true);
      }
    }
  }

  function move(index: number, delta: -1 | 1) {
    setFiles((previous) => {
      const next = [...previous];
      const target = index + delta;
      if (target < 0 || target >= next.length) return previous;
      [next[index], next[target]] = [next[target]!, next[index]!];
      return next;
    });
  }

  async function merge() {
    setBusy(true);
    setFailed(false);
    try {
      const output = await PDFDocument.create();
      for (const file of files) {
        const pages = await output.copyPages(file.doc, file.doc.getPageIndices());
        for (const page of pages) output.addPage(page);
      }
      downloadPdf(await output.save(), "merged.pdf");
    } catch {
      setFailed(true);
    } finally {
      setBusy(false);
    }
  }

  const totalPages = files.reduce((sum, file) => sum + file.pageCount, 0);

  usePendingPdf((files) => void add(files));

  return (
    <div className="flex flex-col gap-5">
      <PdfDropZone onFiles={(incoming) => void add(incoming)} multiple hasFile={files.length > 0} />

      {failed ? (
        <p role="alert" className="text-sm text-danger">
          {t("ui.errorLoad")}
        </p>
      ) : null}

      {files.length > 0 ? (
        <>
          <ol className="flex flex-col gap-2">
            {files.map((file, index) => (
              <li
                key={`${file.name}-${index}`}
                className="flex items-center gap-3 rounded-lg border border-border-subtle bg-surface px-3 py-2"
              >
                <span className="w-6 shrink-0 text-center text-sm tabular-nums text-text-muted">
                  {index + 1}
                </span>
                <span dir="ltr" className="min-w-0 flex-1 truncate text-start text-sm font-medium">
                  {file.name}
                </span>
                <Badge variant="neutral">{t("ui.pageCount", { count: file.pageCount })}</Badge>
                <IconButton
                  aria-label={t("ui.moveUp")}
                  icon={ArrowUp}
                  size="sm"
                  variant="ghost"
                  disabled={index === 0}
                  onClick={() => move(index, -1)}
                />
                <IconButton
                  aria-label={t("ui.moveDown")}
                  icon={ArrowDown}
                  size="sm"
                  variant="ghost"
                  disabled={index === files.length - 1}
                  onClick={() => move(index, 1)}
                />
                <IconButton
                  aria-label={t("ui.remove")}
                  icon={X}
                  size="sm"
                  variant="ghost"
                  onClick={() => setFiles((previous) => previous.filter((_, i) => i !== index))}
                />
              </li>
            ))}
          </ol>

          <div className="flex items-center gap-3">
            <Button type="button" onClick={() => void merge()} disabled={files.length < 2 || busy}>
              {busy ? t("ui.working") : t("ui.mergeAction", { count: totalPages })}
            </Button>
            {files.length < 2 ? (
              <p className="text-sm text-text-muted">{t("ui.mergeNeedTwo")}</p>
            ) : null}
          </div>
          <p className="text-sm text-text-muted">{t("ui.privacy")}</p>
        </>
      ) : null}
    </div>
  );
}
