"use client";

import { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { takePendingFiles } from "@omnio/module-sdk";
import { Button, IconButton, Label } from "@omnio/ui";
import { X } from "lucide-react";
import { downloadBlob } from "../lib/image-file.tsx";

const CELL = 320;
const GAP = 16;
const LABEL_H = 28;

/** Contact sheet — many images tiled into one labeled overview PNG. */
export default function ContactSheetTool() {
  const t = useTranslations("mod-imagekit");
  const inputRef = useRef<HTMLInputElement>(null);
  const [files, setFiles] = useState<File[]>([]);
  const [columns, setColumns] = useState(3);
  const [dragOver, setDragOver] = useState(false);
  const [busy, setBusy] = useState(false);

  function add(list: FileList | File[] | null) {
    if (!list) return;
    setFiles((previous) => [...previous, ...[...list].filter((file) => file.type.startsWith("image/"))]);
  }

  useEffect(() => {
    const handed = takePendingFiles();
    if (handed) add(handed);
  }, []);

  async function generate() {
    if (files.length === 0) return;
    setBusy(true);
    try {
      const rows = Math.ceil(files.length / columns);
      const canvas = document.createElement("canvas");
      canvas.width = columns * CELL + (columns + 1) * GAP;
      canvas.height = rows * (CELL + LABEL_H) + (rows + 1) * GAP;
      const context = canvas.getContext("2d");
      if (!context) return;
      context.fillStyle = "#ffffff";
      context.fillRect(0, 0, canvas.width, canvas.height);
      context.font = "13px system-ui, sans-serif";
      context.textAlign = "center";

      for (const [index, file] of files.entries()) {
        const bitmap = await createImageBitmap(file);
        const column = index % columns;
        const row = Math.floor(index / columns);
        const x = GAP + column * (CELL + GAP);
        const y = GAP + row * (CELL + LABEL_H + GAP);
        // Fit inside the cell, centered, aspect preserved.
        const scale = Math.min(CELL / bitmap.width, CELL / bitmap.height);
        const w = Math.round(bitmap.width * scale);
        const h = Math.round(bitmap.height * scale);
        context.drawImage(bitmap, x + (CELL - w) / 2, y + (CELL - h) / 2, w, h);
        bitmap.close();
        context.fillStyle = "#444444";
        const label = file.name.length > 38 ? `${file.name.slice(0, 35)}…` : file.name;
        context.fillText(label, x + CELL / 2, y + CELL + 18, CELL);
      }
      const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/png"));
      if (blob) downloadBlob(blob, "contact-sheet.png");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col gap-5">
      <div
        role="button"
        tabIndex={0}
        aria-label={t("ui.dropLabel")}
        onClick={() => inputRef.current?.click()}
        onKeyDown={(event) => {
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            inputRef.current?.click();
          }
        }}
        onDragOver={(event) => {
          event.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(event) => {
          event.preventDefault();
          setDragOver(false);
          add(event.dataTransfer.files);
        }}
        className={`flex cursor-pointer flex-col items-center justify-center gap-1.5 rounded-xl border-2 border-dashed text-center transition-colors duration-(--motion-fast) ${
          files.length > 0 ? "px-4 py-3" : "p-8"
        } ${dragOver ? "border-accent bg-accent-subtle" : "border-border hover:border-border-strong"}`}
      >
        <p className="text-sm font-medium">
          {files.length > 0 ? t("ui.batchDropMore") : t("ui.sheetDropTitle")}
        </p>
        {files.length === 0 ? <p className="text-sm text-text-muted">{t("ui.sheetDropHint")}</p> : null}
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          multiple
          className="sr-only"
          onChange={(event) => {
            add(event.target.files);
            event.target.value = "";
          }}
        />
      </div>

      {files.length > 0 ? (
        <>
          <ul className="flex max-h-48 flex-col gap-1.5 overflow-y-auto pe-1 text-sm">
            {files.map((file, index) => (
              <li key={`${file.name}-${index}`} className="flex items-center gap-2 rounded-lg border border-border-subtle bg-surface px-3 py-1.5">
                <span dir="ltr" className="min-w-0 flex-1 truncate text-start">{file.name}</span>
                <IconButton
                  aria-label={t("ui.batchRemove")}
                  icon={X}
                  size="sm"
                  variant="ghost"
                  onClick={() => setFiles((previous) => previous.filter((_, i) => i !== index))}
                />
              </li>
            ))}
          </ul>
          <div className="flex flex-wrap items-end gap-4">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="sheet-cols">{t("ui.sheetColumns", { count: columns })}</Label>
              <input
                id="sheet-cols"
                type="range"
                min={2}
                max={6}
                value={columns}
                onChange={(event) => setColumns(Number(event.target.value))}
                className="accent-accent"
              />
            </div>
            <Button type="button" onClick={() => void generate()} disabled={busy}>
              {busy ? t("ui.working") : t("ui.sheetGenerate", { count: files.length })}
            </Button>
          </div>
          <p className="text-sm text-text-muted">{t("ui.privacy")}</p>
        </>
      ) : null}
    </div>
  );
}
