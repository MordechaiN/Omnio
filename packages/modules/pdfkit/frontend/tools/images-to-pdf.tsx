"use client";

import { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { takePendingFiles } from "@omnio/module-sdk";
import { PDFDocument } from "pdf-lib";
import { Badge, Button, IconButton, Label, Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@omnio/ui";
import { ArrowDown, ArrowUp, X } from "lucide-react";
import { downloadPdf } from "../lib/pdf-file.tsx";

type PageSize = "fit" | "a4" | "letter";
const PAGE_DIMS: Record<Exclude<PageSize, "fit">, { w: number; h: number }> = {
  a4: { w: 595.28, h: 841.89 },
  letter: { w: 612, h: 792 },
};

/** Images → PDF — combine JPG/PNG/WebP into one document, in your order. */
export default function ImagesToPdfTool() {
  const t = useTranslations("mod-pdfkit");
  const inputRef = useRef<HTMLInputElement>(null);
  const [files, setFiles] = useState<File[]>([]);
  const [pageSize, setPageSize] = useState<PageSize>("fit");
  const [dragOver, setDragOver] = useState(false);
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);

  function add(list: FileList | File[] | null) {
    if (!list) return;
    setFiles((prev) => [...prev, ...[...list].filter((f) => f.type.startsWith("image/"))]);
  }
  useEffect(() => {
    const handed = takePendingFiles();
    if (handed) add(handed);
  }, []);

  function move(index: number, delta: -1 | 1) {
    setFiles((prev) => {
      const next = [...prev];
      const target = index + delta;
      if (target < 0 || target >= next.length) return prev;
      [next[index], next[target]] = [next[target]!, next[index]!];
      return next;
    });
  }

  async function build() {
    setBusy(true);
    setFailed(false);
    try {
      const doc = await PDFDocument.create();
      for (const file of files) {
        const bytes = new Uint8Array(await file.arrayBuffer());
        const image =
          file.type === "image/png"
            ? await doc.embedPng(bytes)
            : file.type === "image/jpeg"
              ? await doc.embedJpg(bytes)
              : // WebP/GIF/etc: rasterize through a canvas to PNG first.
                await doc.embedPng(await toPngBytes(file));
        if (pageSize === "fit") {
          const page = doc.addPage([image.width, image.height]);
          page.drawImage(image, { x: 0, y: 0, width: image.width, height: image.height });
        } else {
          const { w, h } = PAGE_DIMS[pageSize];
          const page = doc.addPage([w, h]);
          const scale = Math.min(w / image.width, h / image.height) * 0.94;
          const dw = image.width * scale;
          const dh = image.height * scale;
          page.drawImage(image, { x: (w - dw) / 2, y: (h - dh) / 2, width: dw, height: dh });
        }
      }
      downloadPdf(await doc.save(), "images.pdf");
    } catch {
      setFailed(true);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col gap-5">
      <label
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragOver(false);
          add(e.dataTransfer.files);
        }}
        className={`flex cursor-pointer flex-col items-center justify-center gap-1.5 rounded-xl border-2 border-dashed text-center transition-colors duration-(--motion-fast) ${
          files.length > 0 ? "px-4 py-3" : "p-8"
        } ${dragOver ? "border-accent bg-accent-subtle" : "border-border hover:border-border-strong"}`}
      >
        <p className="text-sm font-medium">{files.length > 0 ? t("ui.i2pDropMore") : t("ui.i2pDropTitle")}</p>
        {files.length === 0 ? <p className="text-sm text-text-muted">{t("ui.i2pDropHint")}</p> : null}
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          multiple
          aria-label={t("ui.i2pDropTitle")}
          className="sr-only"
          onChange={(e) => {
            add(e.target.files);
            e.target.value = "";
          }}
        />
      </label>

      {files.length > 0 ? (
        <>
          <ol className="flex max-h-72 flex-col gap-1.5 overflow-y-auto pe-1">
            {files.map((file, index) => (
              <li key={`${file.name}-${index}`} className="flex items-center gap-3 rounded-lg border border-border-subtle bg-surface px-3 py-1.5 text-sm">
                <span className="w-6 shrink-0 text-center tabular-nums text-text-muted">{index + 1}</span>
                <span dir="ltr" className="min-w-0 flex-1 truncate text-start">{file.name}</span>
                <IconButton aria-label={t("ui.moveUp")} icon={ArrowUp} size="sm" variant="ghost" disabled={index === 0} onClick={() => move(index, -1)} />
                <IconButton aria-label={t("ui.moveDown")} icon={ArrowDown} size="sm" variant="ghost" disabled={index === files.length - 1} onClick={() => move(index, 1)} />
                <IconButton aria-label={t("ui.remove")} icon={X} size="sm" variant="ghost" onClick={() => setFiles((p) => p.filter((_, i) => i !== index))} />
              </li>
            ))}
          </ol>

          <div className="flex flex-wrap items-end gap-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="i2p-size">{t("ui.i2pPageSize")}</Label>
              <Select value={pageSize} onValueChange={(v) => setPageSize(v as PageSize)}>
                <SelectTrigger id="i2p-size" className="w-44"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="fit">{t("ui.i2pFit")}</SelectItem>
                  <SelectItem value="a4">A4</SelectItem>
                  <SelectItem value="letter">Letter</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button type="button" onClick={() => void build()} disabled={busy}>
              {busy ? t("ui.working") : t("ui.i2pAction", { count: files.length })}
            </Button>
            {files.length > 0 ? <Badge variant="neutral">{t("ui.pageCount", { count: files.length })}</Badge> : null}
          </div>
          {failed ? <p role="alert" className="text-sm text-danger">{t("ui.errorSave")}</p> : null}
          <p className="text-sm text-text-muted">{t("ui.privacy")}</p>
        </>
      ) : null}
    </div>
  );
}

async function toPngBytes(file: File): Promise<Uint8Array> {
  const bitmap = await createImageBitmap(file);
  const canvas = document.createElement("canvas");
  canvas.width = bitmap.width;
  canvas.height = bitmap.height;
  canvas.getContext("2d")?.drawImage(bitmap, 0, 0);
  bitmap.close();
  const blob = await new Promise<Blob | null>((r) => canvas.toBlob(r, "image/png"));
  return new Uint8Array(await blob!.arrayBuffer());
}
