"use client";

import { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { takePendingFiles } from "@omnio/module-sdk";
import { unzip } from "fflate";
import { Badge, Button } from "@omnio/ui";
import { downloadName, sanitizeEntryName } from "../../shared/entries.ts";

interface Entry {
  name: string;
  bytes: Uint8Array;
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function save(entry: Entry) {
  const url = URL.createObjectURL(new Blob([entry.bytes as BlobPart]));
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = downloadName(entry.name);
  anchor.click();
  URL.revokeObjectURL(url);
}

/** Extract ZIP — open an archive, browse its files, save what you need. */
export default function ZipExtractTool() {
  const t = useTranslations("mod-zipkit");
  const inputRef = useRef<HTMLInputElement>(null);
  const [archive, setArchive] = useState<{ name: string; entries: Entry[] } | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [failed, setFailed] = useState(false);

  async function open(file: File) {
    setFailed(false);
    try {
      const data = new Uint8Array(await file.arrayBuffer());
      const unzipped = await new Promise<Record<string, Uint8Array>>((resolve, reject) =>
        unzip(data, (error, result) => (error ? reject(error) : resolve(result))),
      );
      const entries = Object.entries(unzipped)
        .map(([rawName, bytes]) => {
          const name = sanitizeEntryName(rawName);
          return name ? { name, bytes } : null;
        })
        .filter((entry): entry is Entry => entry !== null)
        .sort((a, b) => a.name.localeCompare(b.name));
      setArchive({ name: file.name, entries });
    } catch {
      setFailed(true);
      setArchive(null);
    }
  }

  // Universal drop zone hand-off — open the file the shell brought along.
  useEffect(() => {
    const handed = takePendingFiles()?.[0];
    if (handed) void open(handed);
  }, []);

  return (
    <div className="flex flex-col gap-5">
      <label
        onDragOver={(event) => {
          event.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(event) => {
          event.preventDefault();
          setDragOver(false);
          const file = event.dataTransfer.files[0];
          if (file) void open(file);
        }}
        className={`flex cursor-pointer flex-col items-center justify-center gap-1.5 rounded-xl border-2 border-dashed text-center transition-colors duration-(--motion-fast) ${
          archive ? "px-4 py-3" : "p-8"
        } ${dragOver ? "border-accent bg-accent-subtle" : "border-border hover:border-border-strong"}`}
      >
        <p className="text-sm font-medium">
          {archive ? t("ui.extractDropReplace") : t("ui.extractDropTitle")}
        </p>
        {!archive ? <p className="text-sm text-text-muted">{t("ui.dropHint")}</p> : null}
        <input
          ref={inputRef}
          type="file"
          accept=".zip,application/zip"
          aria-label={t("ui.extractDropLabel")}
          className="sr-only"
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (file) void open(file);
            event.target.value = "";
          }}
        />
      </label>

      {failed ? (
        <p role="alert" className="text-sm text-danger">
          {t("ui.errorExtract")}
        </p>
      ) : null}

      {archive ? (
        <>
          <div className="flex flex-wrap items-center gap-2 text-sm">
            <span dir="ltr" className="max-w-60 truncate font-medium">
              {archive.name}
            </span>
            <Badge variant="neutral">{t("ui.entryCount", { count: archive.entries.length })}</Badge>
          </div>

          {archive.entries.length === 0 ? (
            <p className="text-sm text-text-muted">{t("ui.emptyArchive")}</p>
          ) : (
            <>
              <ul className="flex max-h-80 flex-col gap-1.5 overflow-y-auto pe-1">
                {archive.entries.map((entry) => (
                  <li
                    key={entry.name}
                    className="flex items-center gap-3 rounded-lg border border-border-subtle bg-surface px-3 py-1.5 text-sm"
                  >
                    <span dir="ltr" className="min-w-0 flex-1 truncate text-start font-mono text-xs">
                      {entry.name}
                    </span>
                    <Badge variant="neutral">{formatBytes(entry.bytes.length)}</Badge>
                    <Button type="button" variant="secondary" size="sm" onClick={() => save(entry)}>
                      {t("ui.saveEntry")}
                    </Button>
                  </li>
                ))}
              </ul>
              <div>
                <Button
                  type="button"
                  onClick={() => archive.entries.forEach((entry) => save(entry))}
                >
                  {t("ui.saveAll", { count: archive.entries.length })}
                </Button>
              </div>
            </>
          )}
          <p className="text-sm text-text-muted">{t("ui.privacy")}</p>
        </>
      ) : null}
    </div>
  );
}
