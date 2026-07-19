"use client";

import { useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { PDFDocument } from "pdf-lib";

export interface LoadedPdf {
  name: string;
  size: number;
  doc: PDFDocument;
  pageCount: number;
}

export async function loadPdf(file: File): Promise<LoadedPdf> {
  const bytes = await file.arrayBuffer();
  // ignoreEncryption: viewer-encrypted files still open; edit fails loudly later.
  const doc = await PDFDocument.load(bytes, { ignoreEncryption: true });
  return { name: file.name, size: file.size, doc, pageCount: doc.getPageCount() };
}

export function downloadPdf(bytes: Uint8Array, filename: string): void {
  const blob = new Blob([bytes as BlobPart], { type: "application/pdf" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

/**
 * Shared PDF drop zone — click, keyboard, or drag PDFs in. `multiple` feeds
 * tools like merge; single-file tools take the first file.
 */
export function PdfDropZone({
  onFiles,
  multiple,
  hasFile,
}: {
  onFiles: (files: File[]) => void;
  multiple?: boolean;
  hasFile: boolean;
}) {
  const t = useTranslations("mod-pdfkit");
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);

  function accept(list: FileList | null) {
    if (!list) return;
    const files = [...list].filter(
      (file) => file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf"),
    );
    if (files.length > 0) onFiles(multiple ? files : files.slice(0, 1));
  }

  return (
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
        accept(event.dataTransfer.files);
      }}
      className={`flex cursor-pointer flex-col items-center justify-center gap-1.5 rounded-xl border-2 border-dashed text-center transition-colors duration-(--motion-fast) ${
        hasFile ? "px-4 py-3" : "p-8"
      } ${dragOver ? "border-accent bg-accent-subtle" : "border-border hover:border-border-strong"}`}
    >
      <p className="text-sm font-medium">
        {hasFile ? t("ui.dropMore") : multiple ? t("ui.dropTitleMany") : t("ui.dropTitle")}
      </p>
      {!hasFile ? <p className="text-sm text-text-muted">{t("ui.dropHint")}</p> : null}
      <input
        ref={inputRef}
        type="file"
        accept="application/pdf,.pdf"
        multiple={multiple}
        className="sr-only"
        onChange={(event) => {
          accept(event.target.files);
          event.target.value = "";
        }}
      />
    </div>
  );
}
