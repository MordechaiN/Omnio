"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { PDFDocument } from "pdf-lib";
import { Badge, Button, Select, SelectContent, SelectItem, SelectTrigger, SelectValue, Label } from "@omnio/ui";
import { pdfFilename } from "../../shared/pages.ts";
import { downloadPdf, loadPdf, PdfDropZone, usePendingPdf, type LoadedPdf } from "../lib/pdf-file.tsx";

/** Split in half — turn each two-page spread scan into single pages. */
export default function PdfSplitHalfTool() {
  const t = useTranslations("mod-pdfkit");
  const [file, setFile] = useState<LoadedPdf | null>(null);
  const [direction, setDirection] = useState<"vertical" | "horizontal">("vertical");
  const [failed, setFailed] = useState<"load" | "save" | null>(null);
  const [busy, setBusy] = useState(false);

  async function open(files: File[]) {
    setFailed(null);
    try {
      setFile(await loadPdf(files[0]!));
    } catch {
      setFailed("load");
    }
  }
  usePendingPdf((files) => void open(files));

  async function run() {
    if (!file) return;
    setBusy(true);
    setFailed(null);
    try {
      const out = await PDFDocument.create();
      const indices = file.doc.getPageIndices();
      const embedded = await out.embedPdf(file.doc, indices);
      for (const embed of embedded) {
        const { width, height } = embed;
        // Two output pages, each showing one half of the source, via draw offset.
        for (const half of [0, 1]) {
          if (direction === "vertical") {
            const page = out.addPage([width / 2, height]);
            page.drawPage(embed, { x: half === 0 ? 0 : -width / 2, y: 0, width, height });
          } else {
            const page = out.addPage([width, height / 2]);
            // Top half first: shift the full page down so its top shows.
            page.drawPage(embed, { x: 0, y: half === 0 ? -height / 2 : 0, width, height });
          }
        }
      }
      downloadPdf(await out.save(), pdfFilename(file.name, "split"));
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
          <div className="flex max-w-xs flex-col gap-1.5">
            <Label htmlFor="half-dir">{t("ui.halfDirection")}</Label>
            <Select value={direction} onValueChange={(v) => setDirection(v as "vertical" | "horizontal")}>
              <SelectTrigger id="half-dir"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="vertical">{t("ui.halfVertical")}</SelectItem>
                <SelectItem value="horizontal">{t("ui.halfHorizontal")}</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {failed === "save" ? <p role="alert" className="text-sm text-danger">{t("ui.errorSave")}</p> : null}
          <div>
            <Button type="button" onClick={() => void run()} disabled={busy}>
              {busy ? t("ui.working") : t("ui.halfAction")}
            </Button>
          </div>
          <p className="text-sm text-text-muted">{t("ui.privacy")}</p>
        </>
      ) : null}
    </div>
  );
}
