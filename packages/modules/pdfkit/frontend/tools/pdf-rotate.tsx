"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { degrees } from "pdf-lib";
import { Badge, Button, Input, Label } from "@omnio/ui";
import { parsePageRanges, pdfFilename } from "../../shared/pages.ts";
import { downloadPdf, loadPdf, PdfDropZone, usePendingPdf, type LoadedPdf } from "../lib/pdf-file.tsx";

const ANGLES = [90, 180, 270] as const;

/** Rotate — turn all pages or a selection by 90/180/270 degrees. */
export default function PdfRotateTool() {
  const t = useTranslations("mod-pdfkit");
  const [file, setFile] = useState<LoadedPdf | null>(null);
  const [range, setRange] = useState("");
  const [angle, setAngle] = useState<(typeof ANGLES)[number]>(90);
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

  // Empty range = all pages; anything typed must parse.
  const pages = file
    ? range.trim() === ""
      ? file.doc.getPageIndices()
      : parsePageRanges(range, file.pageCount)
    : null;

  async function rotate() {
    if (!file || !pages) return;
    setBusy(true);
    setFailed(null);
    try {
      for (const index of pages) {
        const page = file.doc.getPage(index);
        page.setRotation(degrees((page.getRotation().angle + angle) % 360));
      }
      downloadPdf(await file.doc.save(), pdfFilename(file.name, "rotated"));
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

          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm text-text-muted">{t("ui.angleLabel")}</span>
            {ANGLES.map((value) => (
              <Button
                key={value}
                type="button"
                variant={angle === value ? "primary" : "secondary"}
                size="sm"
                aria-pressed={angle === value}
                onClick={() => setAngle(value)}
              >
                {value}°
              </Button>
            ))}
          </div>

          <div className="flex max-w-md flex-col gap-1.5">
            <Label htmlFor="rotate-range">{t("ui.rangeOptionalLabel")}</Label>
            <Input
              id="rotate-range"
              dir="ltr"
              className="font-mono"
              placeholder={t("ui.rangeAllPlaceholder")}
              value={range}
              spellCheck={false}
              autoComplete="off"
              aria-invalid={range.trim() !== "" && pages === null ? true : undefined}
              onChange={(event) => setRange(event.target.value)}
            />
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
            <Button type="button" onClick={() => void rotate()} disabled={!pages || busy}>
              {busy ? t("ui.working") : t("ui.rotateAction", { count: pages?.length ?? 0 })}
            </Button>
          </div>
          <p className="text-sm text-text-muted">{t("ui.privacy")}</p>
        </>
      ) : null}
    </div>
  );
}
