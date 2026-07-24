"use client";

import { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { takePendingFiles } from "@omnio/module-sdk";
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

/**
 * Universal drop zone hand-off: when the shell navigated here with file(s),
 * open them immediately — the user already chose this tool for them.
 */
export function usePendingPdf(onFiles: (files: File[]) => void): void {
  const handler = useRef(onFiles);
  handler.current = onFiles;
  useEffect(() => {
    const handed = takePendingFiles();
    if (handed && handed.length > 0) handler.current(handed);
  }, []);
}

export function downloadPdf(bytes: Uint8Array, filename: string): void {
  const blob = new Blob([bytes as BlobPart], { type: "application/pdf" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);

  // Also keep the result in the file workspace, so a tool's output can feed the
  // next tool without a round trip through the downloads folder. Every PDF tool
  // downloads through this one function, so hooking it here adopts the whole
  // suite at once. Fire-and-forget: the download above is the guaranteed
  // behaviour, and a workspace failure must never affect it.
  window.dispatchEvent(
    new CustomEvent("omnio:workspace-produce", {
      detail: { blob, name: filename, mime: "application/pdf" },
    }),
  );
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
    // A <label> wrapping the real input is natively clickable and
    // keyboard-operable — no role/tabIndex/key handler, and no
    // interactive-in-interactive nesting. Drag handlers stay on the label.
    <label
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
        aria-label={t("ui.dropLabel")}
        className="sr-only"
        onChange={(event) => {
          accept(event.target.files);
          event.target.value = "";
        }}
      />
    </label>
  );
}
