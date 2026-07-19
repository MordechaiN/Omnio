"use client";

import { useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { zip, type Zippable } from "fflate";
import { Badge, Button, IconButton, Input, Label } from "@omnio/ui";
import { X } from "lucide-react";
import { archiveName } from "../../shared/entries.ts";

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/** Create ZIP — bundle any files into one archive, on your device. */
export default function ZipCreateTool() {
  const t = useTranslations("mod-zipkit");
  const inputRef = useRef<HTMLInputElement>(null);
  const [files, setFiles] = useState<File[]>([]);
  const [name, setName] = useState("archive");
  const [dragOver, setDragOver] = useState(false);
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);

  function add(list: FileList | null) {
    if (!list) return;
    setFiles((previous) => [...previous, ...list]);
  }

  async function create() {
    setBusy(true);
    setFailed(false);
    try {
      const payload: Zippable = {};
      for (const file of files) {
        // Duplicate names get a numeric suffix so nothing silently overwrites.
        let entryName = file.name;
        let counter = 2;
        while (entryName in payload) {
          const dot = file.name.lastIndexOf(".");
          entryName =
            dot > 0
              ? `${file.name.slice(0, dot)}-${counter}${file.name.slice(dot)}`
              : `${file.name}-${counter}`;
          counter += 1;
        }
        payload[entryName] = new Uint8Array(await file.arrayBuffer());
      }
      const bytes = await new Promise<Uint8Array>((resolve, reject) =>
        zip(payload, { level: 6 }, (error, data) => (error ? reject(error) : resolve(data))),
      );
      const url = URL.createObjectURL(new Blob([bytes as BlobPart], { type: "application/zip" }));
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = archiveName(name);
      anchor.click();
      URL.revokeObjectURL(url);
    } catch {
      setFailed(true);
    } finally {
      setBusy(false);
    }
  }

  const totalSize = files.reduce((sum, file) => sum + file.size, 0);

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
          {files.length > 0 ? t("ui.dropMore") : t("ui.dropTitle")}
        </p>
        {files.length === 0 ? <p className="text-sm text-text-muted">{t("ui.dropHint")}</p> : null}
        <input
          ref={inputRef}
          type="file"
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
          <ul className="flex max-h-72 flex-col gap-1.5 overflow-y-auto pe-1">
            {files.map((file, index) => (
              <li
                key={`${file.name}-${index}`}
                className="flex items-center gap-3 rounded-lg border border-border-subtle bg-surface px-3 py-1.5 text-sm"
              >
                <span dir="ltr" className="min-w-0 flex-1 truncate text-start">
                  {file.name}
                </span>
                <Badge variant="neutral">{formatBytes(file.size)}</Badge>
                <IconButton
                  aria-label={t("ui.remove")}
                  icon={X}
                  size="sm"
                  variant="ghost"
                  onClick={() => setFiles((previous) => previous.filter((_, i) => i !== index))}
                />
              </li>
            ))}
          </ul>

          <div className="flex flex-wrap items-end gap-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="zip-name">{t("ui.archiveName")}</Label>
              <Input
                id="zip-name"
                dir="ltr"
                className="w-56"
                value={name}
                onChange={(event) => setName(event.target.value)}
              />
            </div>
            <Button type="button" onClick={() => void create()} disabled={busy}>
              {busy
                ? t("ui.working")
                : t("ui.createAction", { count: files.length, size: formatBytes(totalSize) })}
            </Button>
          </div>

          {failed ? (
            <p role="alert" className="text-sm text-danger">
              {t("ui.errorCreate")}
            </p>
          ) : null}
          <p className="text-sm text-text-muted">{t("ui.privacy")}</p>
        </>
      ) : null}
    </div>
  );
}
