"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { PDFDocument } from "pdf-lib";
import { Badge, Button, Input, Label } from "@omnio/ui";
import { pdfFilename } from "../../shared/pages.ts";
import { downloadPdf, loadPdf, PdfDropZone, usePendingPdf, type LoadedPdf } from "../lib/pdf-file.tsx";

/**
 * Split by size — greedily packs pages into parts that stay under a target
 * size. Page byte-size is estimated by re-serializing the doc up to that
 * page (accurate; a bit of extra CPU is worth an honest split).
 */
export default function PdfSplitSizeTool() {
  const t = useTranslations("mod-pdfkit");
  const [file, setFile] = useState<LoadedPdf | null>(null);
  const [targetMb, setTargetMb] = useState("5");
  const [failed, setFailed] = useState<"load" | "save" | null>(null);
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null);

  async function open(files: File[]) {
    setFailed(null);
    try {
      setFile(await loadPdf(files[0]!));
    } catch {
      setFailed("load");
    }
  }
  usePendingPdf((files) => void open(files));

  async function split() {
    if (!file) return;
    const limitBytes = Math.max(0.2, Number(targetMb) || 5) * 1024 * 1024;
    setBusy(true);
    setFailed(null);
    setProgress(null);
    try {
      const totalPages = file.pageCount;
      const parts: number[][] = [];
      let current: number[] = [];
      let currentDoc = await PDFDocument.create();

      for (let page = 0; page < totalPages; page += 1) {
        const [copied] = await currentDoc.copyPages(file.doc, [page]);
        currentDoc.addPage(copied);
        const size = (await currentDoc.save()).byteLength;
        if (size > limitBytes && current.length > 0) {
          // This page pushed us over — close the part without it, start fresh.
          parts.push(current);
          current = [page];
          currentDoc = await PDFDocument.create();
          const [retry] = await currentDoc.copyPages(file.doc, [page]);
          currentDoc.addPage(retry);
        } else {
          current.push(page);
        }
        setProgress({ done: page + 1, total: totalPages });
      }
      if (current.length > 0) parts.push(current);

      for (const [index, pageIndices] of parts.entries()) {
        const output = await PDFDocument.create();
        const copied = await output.copyPages(file.doc, pageIndices);
        for (const page of copied) output.addPage(page);
        downloadPdf(
          await output.save(),
          pdfFilename(file.name, `part${index + 1}of${parts.length}`),
        );
      }
    } catch {
      setFailed("save");
    } finally {
      setBusy(false);
      setProgress(null);
    }
  }

  return (
    <div className="flex flex-col gap-5">
      <PdfDropZone onFiles={(files) => void open(files)} hasFile={file !== null} />
      {failed === "load" ? (
        <p role="alert" className="text-sm text-danger">{t("ui.errorLoad")}</p>
      ) : null}

      {file ? (
        <>
          <div className="flex flex-wrap items-center gap-2 text-sm">
            <span dir="ltr" className="max-w-60 truncate font-medium">{file.name}</span>
            <Badge variant="neutral">{t("ui.pageCount", { count: file.pageCount })}</Badge>
          </div>
          <div className="flex max-w-xs flex-col gap-1.5">
            <Label htmlFor="split-size-mb">{t("ui.splitSizeLabel")}</Label>
            <Input
              id="split-size-mb"
              dir="ltr"
              type="number"
              inputMode="decimal"
              min={0.2}
              step={0.5}
              value={targetMb}
              onChange={(event) => setTargetMb(event.target.value)}
            />
          </div>
          {failed === "save" ? (
            <p role="alert" className="text-sm text-danger">{t("ui.errorSave")}</p>
          ) : null}
          <div>
            <Button type="button" onClick={() => void split()} disabled={busy}>
              {busy
                ? progress
                  ? t("ui.splitSizeProgress", { done: progress.done, total: progress.total })
                  : t("ui.working")
                : t("ui.splitSizeAction")}
            </Button>
          </div>
          <p className="text-sm text-text-muted">{t("ui.splitSizeNote")}</p>
          <p className="text-sm text-text-muted">{t("ui.privacy")}</p>
        </>
      ) : null}
    </div>
  );
}
