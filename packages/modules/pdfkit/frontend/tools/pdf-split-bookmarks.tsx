"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { zip, type Zippable } from "fflate";
import { PDFDocument } from "pdf-lib";
import { Badge, Button } from "@omnio/ui";
import { bookmarkRanges } from "../../shared/bookmarks.ts";
import { readOutline } from "../lib/mupdf.ts";
import { loadPdf, PdfDropZone, usePendingPdf, type LoadedPdf } from "../lib/pdf-file.tsx";

function safeName(title: string, index: number): string {
  const clean = title.replace(/[\\/:*?"<>|]+/g, " ").replace(/\s+/g, " ").trim().slice(0, 60);
  return `${String(index + 1).padStart(2, "0")}-${clean || "section"}.pdf`;
}

/** Split by bookmarks — one PDF per top-level bookmark, on your device. */
export default function PdfSplitBookmarksTool() {
  const t = useTranslations("mod-pdfkit");
  const [file, setFile] = useState<LoadedPdf | null>(null);
  const [raw, setRaw] = useState<Uint8Array | null>(null);
  const [count, setCount] = useState<number | null>(null);
  const [failed, setFailed] = useState<"load" | "split" | null>(null);
  const [busy, setBusy] = useState(false);

  async function open(files: File[]) {
    setFailed(null);
    setCount(null);
    try {
      const bytes = new Uint8Array(await files[0]!.arrayBuffer());
      setRaw(bytes);
      setFile(await loadPdf(new File([bytes], files[0]!.name, { type: "application/pdf" })));
    } catch {
      setFailed("load");
    }
  }
  usePendingPdf((files) => void open(files));

  async function run() {
    if (!file || !raw) return;
    setBusy(true);
    setFailed(null);
    setCount(null);
    try {
      const outline = await readOutline(raw);
      const marks = outline
        .filter((o): o is { title: string; page: number } => o.page !== null)
        .map((o) => ({ title: o.title, page: o.page }));
      const ranges = bookmarkRanges(marks, file.pageCount);
      if (ranges.length === 0) {
        setCount(0);
        return;
      }
      const src = await PDFDocument.load(raw, { ignoreEncryption: true });
      const base = file.name.replace(/\.pdf$/i, "") || "document";
      const payload: Zippable = {};
      for (let i = 0; i < ranges.length; i += 1) {
        const { start, end, title } = ranges[i]!;
        const out = await PDFDocument.create();
        const indices = Array.from({ length: end - start + 1 }, (_, k) => start + k);
        const copied = await out.copyPages(src, indices);
        copied.forEach((p) => out.addPage(p));
        payload[safeName(title, i)] = await out.save();
      }
      const bytes = await new Promise<Uint8Array>((resolve, reject) =>
        zip(payload, { level: 0 }, (e, d) => (e ? reject(e) : resolve(d))),
      );
      const url = URL.createObjectURL(new Blob([bytes as BlobPart], { type: "application/zip" }));
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = `${base}-sections.zip`;
      anchor.click();
      URL.revokeObjectURL(url);
      setCount(ranges.length);
    } catch {
      setFailed("split");
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
          <p className="text-sm text-text-muted">{t("ui.splitBmIntro")}</p>
          <div>
            <Button type="button" onClick={() => void run()} disabled={busy}>
              {busy ? t("ui.working") : t("ui.splitBmAction")}
            </Button>
          </div>
          {failed === "split" ? <p role="alert" className="text-sm text-danger">{t("ui.splitBmError")}</p> : null}
          {count === 0 ? <p aria-live="polite" className="text-sm text-text-muted">{t("ui.splitBmNone")}</p> : null}
          {count && count > 0 ? <p aria-live="polite" className="text-sm text-text-muted">{t("ui.splitBmDone", { count })}</p> : null}
          <p className="text-sm text-text-muted">{t("ui.privacy")}</p>
        </>
      ) : null}
    </div>
  );
}
