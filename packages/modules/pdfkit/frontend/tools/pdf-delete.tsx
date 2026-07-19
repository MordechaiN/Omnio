"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { PDFDocument } from "pdf-lib";
import { Badge, Button, Input, Label } from "@omnio/ui";
import { parsePageRanges, pdfFilename, remainingPages } from "../../shared/pages.ts";
import { downloadPdf, loadPdf, PdfDropZone, type LoadedPdf } from "../lib/pdf-file.tsx";

/** Delete pages — remove a selection and keep the rest. */
export default function PdfDeleteTool() {
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

  const deleted = file ? parsePageRanges(range, file.pageCount) : null;
  const kept = file && deleted ? remainingPages(deleted, file.pageCount) : null;

  async function removePages() {
    if (!file || !kept || kept.length === 0) return;
    setBusy(true);
    setFailed(null);
    try {
      // Rebuild from the kept pages — simpler and safer than mutating in place.
      const output = await PDFDocument.create();
      const copied = await output.copyPages(file.doc, kept);
      for (const page of copied) output.addPage(page);
      downloadPdf(await output.save(), pdfFilename(file.name, "edited"));
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
            <Label htmlFor="delete-range">{t("ui.deleteLabel")}</Label>
            <Input
              id="delete-range"
              dir="ltr"
              className="font-mono"
              placeholder="2, 5-6"
              value={range}
              spellCheck={false}
              autoComplete="off"
              aria-invalid={range.trim() !== "" && deleted === null ? true : undefined}
              onChange={(event) => setRange(event.target.value)}
            />
            <p className="text-sm text-text-muted">
              {t("ui.rangeHint", { count: file.pageCount })}
            </p>
            {range.trim() !== "" && deleted === null ? (
              <p role="alert" className="text-sm text-danger">
                {t("ui.rangeInvalid")}
              </p>
            ) : null}
            {kept && kept.length === 0 ? (
              <p role="alert" className="text-sm text-danger">
                {t("ui.deleteAllInvalid")}
              </p>
            ) : null}
          </div>

          {failed === "save" ? (
            <p role="alert" className="text-sm text-danger">
              {t("ui.errorSave")}
            </p>
          ) : null}

          <div>
            <Button
              type="button"
              onClick={() => void removePages()}
              disabled={!kept || kept.length === 0 || busy}
            >
              {busy
                ? t("ui.working")
                : t("ui.deleteAction", {
                    removed: deleted?.length ?? 0,
                    kept: kept?.length ?? 0,
                  })}
            </Button>
          </div>
          <p className="text-sm text-text-muted">{t("ui.privacy")}</p>
        </>
      ) : null}
    </div>
  );
}
