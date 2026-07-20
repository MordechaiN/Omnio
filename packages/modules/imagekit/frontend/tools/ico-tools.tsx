"use client";

import { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { Badge, Button } from "@omnio/ui";
import { extractEntryBytes, parseIco, type IcoEntry } from "../../shared/ico.ts";

interface Loaded {
  name: string;
  buffer: ArrayBuffer;
  entries: IcoEntry[];
}

/** ICO viewer & extractor — inspect an icon file and save its PNG layers. */
export default function IcoToolsTool() {
  const t = useTranslations("mod-imagekit");
  const inputRef = useRef<HTMLInputElement>(null);
  const [loaded, setLoaded] = useState<Loaded | null>(null);
  const [previewUrls, setPreviewUrls] = useState<Array<string | null>>([]);
  const [failed, setFailed] = useState(false);
  const [dragOver, setDragOver] = useState(false);

  // Build preview object URLs once per load, revoke on the next load/unmount.
  useEffect(() => {
    if (!loaded) {
      setPreviewUrls([]);
      return;
    }
    const urls = loaded.entries.map((entry) =>
      entry.isPng
        ? URL.createObjectURL(
            new Blob([extractEntryBytes(loaded.buffer, entry) as BlobPart], { type: "image/png" }),
          )
        : null,
    );
    setPreviewUrls(urls);
    return () => {
      for (const url of urls) if (url) URL.revokeObjectURL(url);
    };
  }, [loaded]);

  async function open(file: File) {
    setFailed(false);
    const buffer = await file.arrayBuffer();
    const entries = parseIco(buffer);
    if (!entries) {
      setFailed(true);
      setLoaded(null);
      return;
    }
    setLoaded({ name: file.name, buffer, entries });
  }

  function save(entry: IcoEntry, index: number) {
    if (!loaded || !entry.isPng) return;
    const bytes = extractEntryBytes(loaded.buffer, entry);
    const url = URL.createObjectURL(new Blob([bytes as BlobPart], { type: "image/png" }));
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `${loaded.name.replace(/\.ico$/i, "")}-${entry.width}x${entry.height}-${index}.png`;
    anchor.click();
    URL.revokeObjectURL(url);
  }

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
        className={`flex cursor-pointer flex-col items-center justify-center gap-1.5 rounded-xl border-2 border-dashed p-8 text-center transition-colors duration-(--motion-fast) ${
          dragOver ? "border-accent bg-accent-subtle" : "border-border hover:border-border-strong"
        }`}
      >
        <p className="text-sm font-medium">{t("ui.icoDropTitle")}</p>
        <p className="text-sm text-text-muted">{t("ui.icoDropHint")}</p>
        <input
          ref={inputRef}
          type="file"
          accept=".ico,image/x-icon,image/vnd.microsoft.icon"
          aria-label={t("ui.icoDropLabel")}
          className="sr-only"
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (file) void open(file);
            event.target.value = "";
          }}
        />
      </label>

      {failed ? (
        <p role="alert" className="text-sm text-danger">{t("ui.icoInvalid")}</p>
      ) : null}

      {loaded ? (
        <>
          <p className="text-sm text-text-muted">
            {t("ui.icoEntries", { count: loaded.entries.length })}
          </p>
          <ul className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {loaded.entries.map((entry, index) => {
              const url = previewUrls[index] ?? null;
              return (
                <li key={index} className="flex flex-col items-center gap-2 rounded-lg border border-border-subtle bg-surface p-3">
                  <div className="flex size-16 items-center justify-center rounded-md bg-surface-raised">
                    {url ? (
                      // Plain <img>: local object URL, next/image has nothing to optimize.
                      <img src={url} alt="" className="max-h-14 max-w-14" />
                    ) : (
                      <span className="text-xs text-text-muted">BMP</span>
                    )}
                  </div>
                  <Badge variant="neutral">
                    <span dir="ltr">{entry.width}×{entry.height}</span>
                  </Badge>
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    disabled={!entry.isPng}
                    onClick={() => save(entry, index)}
                  >
                    {t("ui.icoSave")}
                  </Button>
                </li>
              );
            })}
          </ul>
          <p className="text-sm text-text-muted">{t("ui.icoBmpNote")}</p>
          <p className="text-sm text-text-muted">{t("ui.privacy")}</p>
        </>
      ) : null}
    </div>
  );
}
