"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Badge } from "@omnio/ui";
import { loadPdf, PdfDropZone, usePendingPdf, type LoadedPdf } from "../lib/pdf-file.tsx";

interface MetaRow {
  key: string;
  value: string;
}

/** PDF metadata viewer — title, author, dates, producer, page count. */
export default function PdfMetadataTool() {
  const t = useTranslations("mod-pdfkit");
  const [file, setFile] = useState<LoadedPdf | null>(null);
  const [rows, setRows] = useState<MetaRow[]>([]);
  const [failed, setFailed] = useState(false);

  async function open(files: File[]) {
    setFailed(false);
    try {
      const loaded = await loadPdf(files[0]!);
      setFile(loaded);
      const doc = loaded.doc;
      const entries: Array<[string, string | undefined]> = [
        ["metaTitle", doc.getTitle()],
        ["metaAuthor", doc.getAuthor()],
        ["metaSubject", doc.getSubject()],
        ["metaKeywords", doc.getKeywords()],
        ["metaCreator", doc.getCreator()],
        ["metaProducer", doc.getProducer()],
        ["metaCreated", doc.getCreationDate()?.toISOString().slice(0, 10)],
        ["metaModified", doc.getModificationDate()?.toISOString().slice(0, 10)],
      ];
      setRows(
        entries
          .filter((entry): entry is [string, string] => Boolean(entry[1] && entry[1].trim() !== ""))
          .map(([key, value]) => ({ key, value })),
      );
    } catch {
      setFailed(true);
      setFile(null);
    }
  }
  usePendingPdf((files) => void open(files));

  return (
    <div className="flex flex-col gap-5">
      <PdfDropZone onFiles={(files) => void open(files)} hasFile={file !== null} />
      {failed ? (
        <p role="alert" className="text-sm text-danger">{t("ui.errorLoad")}</p>
      ) : null}

      {file ? (
        <>
          <div className="flex flex-wrap items-center gap-2 text-sm">
            <span dir="ltr" className="max-w-60 truncate font-medium">{file.name}</span>
            <Badge variant="neutral">{t("ui.pageCount", { count: file.pageCount })}</Badge>
          </div>
          {rows.length === 0 ? (
            <p className="text-sm text-text-muted">{t("ui.metaNone")}</p>
          ) : (
            <dl className="grid gap-x-6 gap-y-1.5 rounded-lg border border-border-subtle bg-surface p-4 sm:grid-cols-[auto_1fr]">
              {rows.map((row) => (
                <div key={row.key} className="contents">
                  <dt className="text-sm text-text-muted">
                    {t(`ui.${row.key}` as Parameters<typeof t>[0])}
                  </dt>
                  <dd dir="auto" className="text-start text-sm break-all">{row.value}</dd>
                </div>
              ))}
            </dl>
          )}
          <p className="text-sm text-text-muted">{t("ui.privacy")}</p>
        </>
      ) : null}
    </div>
  );
}
