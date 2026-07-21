"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { PDFDocument } from "pdf-lib";
import { Badge, Button, Label, Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@omnio/ui";
import { nUpLayout } from "../../shared/operations.ts";
import { pdfFilename } from "../../shared/pages.ts";
import { downloadPdf, loadPdf, PdfDropZone, usePendingPdf, type LoadedPdf } from "../lib/pdf-file.tsx";

const A4 = { w: 595.28, h: 841.89 };
const GAP = 8;

/** N-up — place several pages on each sheet to save paper. */
export default function PdfNupTool() {
  const t = useTranslations("mod-pdfkit");
  const [file, setFile] = useState<LoadedPdf | null>(null);
  const [perSheet, setPerSheet] = useState<2 | 4 | 6 | 9>(2);
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
      const layout = nUpLayout(file.pageCount, perSheet);
      const embedded = await out.embedPdf(file.doc, file.doc.getPageIndices());
      const cellW = (A4.w - GAP * (layout.cols + 1)) / layout.cols;
      const cellH = (A4.h - GAP * (layout.rows + 1)) / layout.rows;
      let sheet = out.addPage([A4.w, A4.h]);
      for (let i = 0; i < embedded.length; i += 1) {
        if (i > 0 && i % perSheet === 0) sheet = out.addPage([A4.w, A4.h]);
        const cell = layout.cells[i]!;
        const embed = embedded[i]!;
        const scale = Math.min(cellW / embed.width, cellH / embed.height);
        const dw = embed.width * scale;
        const dh = embed.height * scale;
        const x = GAP + cell.col * (cellW + GAP) + (cellW - dw) / 2;
        // Rows count from the top; PDF y-origin is the bottom.
        const y = A4.h - GAP - (cell.row + 1) * cellH - cell.row * GAP + (cellH - dh) / 2;
        sheet.drawPage(embed, { x, y, width: dw, height: dh });
      }
      downloadPdf(await out.save(), pdfFilename(file.name, `${perSheet}up`));
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
            <Label htmlFor="nup-per">{t("ui.nupPerSheet")}</Label>
            <Select value={String(perSheet)} onValueChange={(v) => setPerSheet(Number(v) as 2 | 4 | 6 | 9)}>
              <SelectTrigger id="nup-per"><SelectValue /></SelectTrigger>
              <SelectContent>
                {[2, 4, 6, 9].map((n) => <SelectItem key={n} value={String(n)}>{t("ui.nupOption", { count: n })}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          {failed === "save" ? <p role="alert" className="text-sm text-danger">{t("ui.errorSave")}</p> : null}
          <div>
            <Button type="button" onClick={() => void run()} disabled={busy}>
              {busy ? t("ui.working") : t("ui.nupAction")}
            </Button>
          </div>
          <p className="text-sm text-text-muted">{t("ui.privacy")}</p>
        </>
      ) : null}
    </div>
  );
}
