"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { PDFCheckBox, PDFDocument, PDFDropdown, PDFRadioGroup, PDFTextField } from "pdf-lib";
import { Badge, Button, Checkbox, Input, Label } from "@omnio/ui";
import { pdfFilename } from "../../shared/pages.ts";
import { downloadPdf, loadPdf, PdfDropZone, usePendingPdf, type LoadedPdf } from "../lib/pdf-file.tsx";

type FieldKind = "text" | "checkbox" | "dropdown" | "radio";
interface FormField {
  name: string;
  kind: FieldKind;
  options?: string[];
  value: string | boolean;
}

/** Fill a PDF form — type into its fields and download, on your device. */
export default function PdfFillFormTool() {
  const t = useTranslations("mod-pdfkit");
  const [file, setFile] = useState<LoadedPdf | null>(null);
  const [raw, setRaw] = useState<Uint8Array | null>(null);
  const [fields, setFields] = useState<FormField[] | null>(null);
  const [flatten, setFlatten] = useState(true);
  const [failed, setFailed] = useState<"load" | "save" | null>(null);
  const [busy, setBusy] = useState(false);

  async function open(files: File[]) {
    setFailed(null);
    setFields(null);
    try {
      const bytes = new Uint8Array(await files[0]!.arrayBuffer());
      setRaw(bytes);
      const loaded = await loadPdf(new File([bytes], files[0]!.name, { type: "application/pdf" }));
      setFile(loaded);
      const form = loaded.doc.getForm();
      const read: FormField[] = [];
      for (const f of form.getFields()) {
        const name = f.getName();
        if (f instanceof PDFTextField) read.push({ name, kind: "text", value: f.getText() ?? "" });
        else if (f instanceof PDFCheckBox) read.push({ name, kind: "checkbox", value: f.isChecked() });
        else if (f instanceof PDFDropdown) read.push({ name, kind: "dropdown", options: f.getOptions(), value: f.getSelected()[0] ?? "" });
        else if (f instanceof PDFRadioGroup) read.push({ name, kind: "radio", options: f.getOptions(), value: f.getSelected() ?? "" });
      }
      setFields(read);
    } catch {
      setFailed("load");
    }
  }
  usePendingPdf((files) => void open(files));

  function update(name: string, value: string | boolean) {
    setFields((fs) => (fs ? fs.map((f) => (f.name === name ? { ...f, value } : f)) : fs));
  }

  async function save() {
    if (!raw || !file || !fields) return;
    setBusy(true);
    setFailed(null);
    try {
      const doc = await PDFDocument.load(raw, { ignoreEncryption: true });
      const form = doc.getForm();
      for (const f of fields) {
        const field = form.getField(f.name);
        if (field instanceof PDFTextField) field.setText(String(f.value));
        else if (field instanceof PDFCheckBox) {
          if (f.value) field.check();
          else field.uncheck();
        } else if (field instanceof PDFDropdown && f.value) field.select(String(f.value));
        else if (field instanceof PDFRadioGroup && f.value) field.select(String(f.value));
      }
      if (flatten) form.flatten();
      downloadPdf(await doc.save(), pdfFilename(file.name, "filled"));
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
            {fields ? <Badge variant="neutral">{t("ui.fillFieldCount", { count: fields.length })}</Badge> : null}
          </div>
          {fields && fields.length === 0 ? (
            <p aria-live="polite" className="text-sm text-text-muted">{t("ui.fillNoFields")}</p>
          ) : null}
          {fields && fields.length > 0 ? (
            <div className="flex flex-col gap-4">
              {fields.map((f) => (
                <div key={f.name} className="flex flex-col gap-1.5">
                  {f.kind === "checkbox" ? (
                    <label className="flex items-center gap-2 text-sm">
                      <Checkbox checked={Boolean(f.value)} onCheckedChange={(c) => update(f.name, Boolean(c))} />
                      <span dir="ltr">{f.name}</span>
                    </label>
                  ) : (
                    <>
                      <Label dir="ltr">{f.name}</Label>
                      {f.kind === "text" ? (
                        <Input value={String(f.value)} onChange={(e) => update(f.name, e.target.value)} />
                      ) : (
                        <select
                          value={String(f.value)}
                          onChange={(e) => update(f.name, e.target.value)}
                          aria-label={f.name}
                          className="rounded-md border border-border bg-surface px-3 py-2 text-sm"
                        >
                          <option value="">—</option>
                          {(f.options ?? []).map((o) => (
                            <option key={o} value={o}>{o}</option>
                          ))}
                        </select>
                      )}
                    </>
                  )}
                </div>
              ))}
              <label className="flex items-center gap-2 text-sm">
                <Checkbox checked={flatten} onCheckedChange={(c) => setFlatten(Boolean(c))} />
                <span>{t("ui.fillFlatten")}</span>
              </label>
              <div>
                <Button type="button" onClick={() => void save()} disabled={busy}>
                  {busy ? t("ui.working") : t("ui.fillAction")}
                </Button>
              </div>
              {failed === "save" ? <p role="alert" className="text-sm text-danger">{t("ui.fillError")}</p> : null}
            </div>
          ) : null}
          <p className="text-sm text-text-muted">{t("ui.privacy")}</p>
        </>
      ) : null}
    </div>
  );
}
