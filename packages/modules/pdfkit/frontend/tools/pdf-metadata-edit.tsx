"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Badge, Button, Input, Label } from "@omnio/ui";
import { pdfFilename } from "../../shared/pages.ts";
import { downloadPdf, loadPdf, PdfDropZone, usePendingPdf, type LoadedPdf } from "../lib/pdf-file.tsx";

const FIELDS = ["title", "author", "subject", "keywords"] as const;

/** PDF metadata editor — change title/author/subject/keywords and re-save. */
export default function PdfMetadataEditTool() {
  const t = useTranslations("mod-pdfkit");
  const [file, setFile] = useState<LoadedPdf | null>(null);
  const [values, setValues] = useState<Record<(typeof FIELDS)[number], string>>({
    title: "",
    author: "",
    subject: "",
    keywords: "",
  });
  const [failed, setFailed] = useState<"load" | "save" | null>(null);
  const [busy, setBusy] = useState(false);

  async function open(files: File[]) {
    setFailed(null);
    try {
      const loaded = await loadPdf(files[0]!);
      setFile(loaded);
      setValues({
        title: loaded.doc.getTitle() ?? "",
        author: loaded.doc.getAuthor() ?? "",
        subject: loaded.doc.getSubject() ?? "",
        keywords: loaded.doc.getKeywords() ?? "",
      });
    } catch {
      setFailed("load");
    }
  }
  usePendingPdf((files) => void open(files));

  async function save() {
    if (!file) return;
    setBusy(true);
    setFailed(null);
    try {
      file.doc.setTitle(values.title);
      file.doc.setAuthor(values.author);
      file.doc.setSubject(values.subject);
      file.doc.setKeywords(values.keywords.split(",").map((k) => k.trim()).filter(Boolean));
      file.doc.setModificationDate(new Date());
      downloadPdf(await file.doc.save(), pdfFilename(file.name, "edited"));
    } catch {
      setFailed("save");
    } finally {
      setBusy(false);
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
          <div className="grid gap-4 sm:grid-cols-2">
            {FIELDS.map((field) => (
              <div key={field} className="flex flex-col gap-1.5">
                <Label htmlFor={`meta-${field}`}>
                  {t(`ui.meta${field.charAt(0).toUpperCase()}${field.slice(1)}` as Parameters<typeof t>[0])}
                </Label>
                <Input
                  id={`meta-${field}`}
                  dir="auto"
                  value={values[field]}
                  onChange={(event) => setValues((previous) => ({ ...previous, [field]: event.target.value }))}
                />
              </div>
            ))}
          </div>
          {failed === "save" ? (
            <p role="alert" className="text-sm text-danger">{t("ui.errorSave")}</p>
          ) : null}
          <div>
            <Button type="button" onClick={() => void save()} disabled={busy}>
              {busy ? t("ui.working") : t("ui.metaEditAction")}
            </Button>
          </div>
          <p className="text-sm text-text-muted">{t("ui.privacy")}</p>
        </>
      ) : null}
    </div>
  );
}
