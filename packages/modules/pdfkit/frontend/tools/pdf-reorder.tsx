"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { PDFDocument } from "pdf-lib";
import { Badge, Button, IconButton } from "@omnio/ui";
import { ArrowDown, ArrowUp } from "lucide-react";
import { pdfFilename } from "../../shared/pages.ts";
import { downloadPdf, loadPdf, PdfDropZone, usePendingPdf, type LoadedPdf } from "../lib/pdf-file.tsx";

/** Reorder — move pages up and down, then save the new order. */
export default function PdfReorderTool() {
  const t = useTranslations("mod-pdfkit");
  const [file, setFile] = useState<LoadedPdf | null>(null);
  const [order, setOrder] = useState<number[]>([]);
  const [failed, setFailed] = useState<"load" | "save" | null>(null);
  const [busy, setBusy] = useState(false);

  async function open(files: File[]) {
    setFailed(null);
    try {
      const loaded = await loadPdf(files[0]!);
      setFile(loaded);
      setOrder(loaded.doc.getPageIndices());
    } catch {
      setFailed("load");
    }
  }

  function move(index: number, delta: -1 | 1) {
    setOrder((previous) => {
      const next = [...previous];
      const target = index + delta;
      if (target < 0 || target >= next.length) return previous;
      [next[index], next[target]] = [next[target]!, next[index]!];
      return next;
    });
  }

  async function save() {
    if (!file) return;
    setBusy(true);
    setFailed(null);
    try {
      const output = await PDFDocument.create();
      const copied = await output.copyPages(file.doc, order);
      for (const page of copied) output.addPage(page);
      downloadPdf(await output.save(), pdfFilename(file.name, "reordered"));
    } catch {
      setFailed("save");
    } finally {
      setBusy(false);
    }
  }

  const dirty = order.some((original, index) => original !== index);

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

          <ol className="flex max-h-96 flex-col gap-1.5 overflow-y-auto pe-1">
            {order.map((original, index) => (
              <li
                key={`${original}-${index}`}
                className="flex items-center gap-3 rounded-lg border border-border-subtle bg-surface px-3 py-1.5 text-sm"
              >
                <span className="w-8 shrink-0 text-center text-xs tabular-nums text-text-muted">
                  {index + 1}
                </span>
                <span className="min-w-0 flex-1 truncate">
                  {t("ui.originalPage", { page: original + 1 })}
                </span>
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
                  disabled={index === order.length - 1}
                  onClick={() => move(index, 1)}
                />
              </li>
            ))}
          </ol>

          {failed === "save" ? (
            <p role="alert" className="text-sm text-danger">
              {t("ui.errorSave")}
            </p>
          ) : null}

          <div>
            <Button type="button" onClick={() => void save()} disabled={!dirty || busy}>
              {busy ? t("ui.working") : t("ui.reorderAction")}
            </Button>
          </div>
          <p className="text-sm text-text-muted">{t("ui.privacy")}</p>
        </>
      ) : null}
    </div>
  );
}
