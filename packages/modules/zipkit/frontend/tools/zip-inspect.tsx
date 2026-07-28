"use client";

import { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { takePendingFiles } from "@omnio/module-sdk";
import { unzip } from "fflate";
import { Badge, Button } from "@omnio/ui";
import {
  summarize,
  topLevelFolders,
  type ArchiveEntry,
  type ArchiveSummary,
} from "../../shared/inspect.ts";

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
}

/**
 * Archive Inspector — tells you what is inside an archive without opening it.
 *
 * fflate's entry filter runs once per entry with its metadata and decides
 * whether that entry should be inflated. Returning false every time walks the
 * whole table of contents and decompresses nothing, so a 40 GB archive is
 * described as fast as a small one and a crafted archive cannot exhaust the tab
 * while being measured.
 */
export default function ZipInspectTool() {
  const t = useTranslations("mod-zipkit");
  const inputRef = useRef<HTMLInputElement>(null);
  const [archive, setArchive] = useState<{
    name: string;
    size: number;
    summary: ArchiveSummary;
    folders: string[];
  } | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [failed, setFailed] = useState(false);

  async function open(file: File) {
    setFailed(false);
    try {
      const data = new Uint8Array(await file.arrayBuffer());
      const entries: ArchiveEntry[] = [];
      await new Promise<void>((resolve, reject) =>
        unzip(
          data,
          {
            filter: (entry) => {
              entries.push({
                name: entry.name,
                packed: entry.size,
                unpacked: entry.originalSize,
              });
              return false; // never inflate
            },
          },
          (error) => (error ? reject(error) : resolve()),
        ),
      );
      setArchive({
        name: file.name,
        size: file.size,
        summary: summarize(entries),
        folders: topLevelFolders(entries),
      });
    } catch {
      setFailed(true);
      setArchive(null);
    }
  }

  useEffect(() => {
    const handed = takePendingFiles()?.[0];
    if (handed) void open(handed);
  }, []);

  const s = archive?.summary;

  return (
    <div className="flex flex-col gap-5">
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragOver(false);
          const file = e.dataTransfer.files[0];
          if (file) void open(file);
        }}
        onClick={() => inputRef.current?.click()}
        className={`flex cursor-pointer items-center justify-center rounded-lg border border-dashed px-4 py-6 text-sm transition-colors duration-(--motion-fast) ${
          dragOver ? "border-accent bg-accent-subtle" : "border-border text-text-muted"
        }`}
      >
        {t("ui.inspectDrop")}
        <input
          ref={inputRef}
          type="file"
          accept=".zip,application/zip"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) void open(file);
          }}
        />
      </div>

      {failed ? (
        <p role="alert" className="text-sm text-danger">
          {t("ui.inspectFailed")}
        </p>
      ) : null}

      {archive && s ? (
        <div className="flex flex-col gap-4">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="neutral">{archive.name}</Badge>
            <Badge variant="neutral">{t("ui.inspectFiles", { count: s.fileCount })}</Badge>
            {s.folderCount > 0 ? (
              <Badge variant="neutral">{t("ui.inspectFolders", { count: s.folderCount })}</Badge>
            ) : null}
          </div>

          <dl className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            <div>
              <dt className="text-xs text-text-muted">{t("ui.inspectPacked")}</dt>
              <dd className="text-sm font-medium">{formatBytes(archive.size)}</dd>
            </div>
            <div>
              <dt className="text-xs text-text-muted">{t("ui.inspectUnpacked")}</dt>
              <dd className="text-sm font-medium">{formatBytes(s.unpackedBytes)}</dd>
            </div>
            {s.ratio !== null ? (
              <div>
                <dt className="text-xs text-text-muted">{t("ui.inspectRatio")}</dt>
                <dd className="text-sm font-medium">{Math.round(s.ratio * 100)}%</dd>
              </div>
            ) : null}
          </dl>

          {s.unsafe.length > 0 ? (
            <div role="alert" className="rounded-lg border border-danger/40 bg-danger/5 p-3">
              <p className="text-sm font-medium text-danger">{t("ui.inspectUnsafeTitle")}</p>
              <p className="text-sm text-text-muted">
                {t("ui.inspectUnsafeBody", { count: s.unsafe.length })}
              </p>
              <ul className="mt-2 flex flex-col gap-0.5">
                {s.unsafe.slice(0, 5).map((name) => (
                  <li key={name} className="font-mono text-xs break-all">
                    {name}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          {s.storedCount > 0 ? (
            <p className="text-sm text-text-muted">
              {t("ui.inspectStored", { count: s.storedCount })}
            </p>
          ) : null}

          {archive.folders.length > 0 ? (
            <div className="flex flex-col gap-1.5">
              <h2 className="text-sm font-medium">{t("ui.inspectTopFolders")}</h2>
              <div className="flex flex-wrap gap-1.5">
                {archive.folders.slice(0, 12).map((folder) => (
                  <Badge key={folder} variant="neutral">
                    {folder}
                  </Badge>
                ))}
              </div>
            </div>
          ) : null}

          {s.largest.length > 0 ? (
            <div className="flex flex-col gap-1.5">
              <h2 className="text-sm font-medium">{t("ui.inspectLargest")}</h2>
              <ul className="flex flex-col gap-1">
                {s.largest.map((item) => (
                  <li
                    key={item.name}
                    className="flex items-center justify-between gap-3 rounded-md border border-border-subtle px-2.5 py-1.5"
                  >
                    <span className="truncate text-sm">{item.name}</span>
                    <span className="shrink-0 text-xs text-text-muted">
                      {formatBytes(item.unpacked)}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          <div className="flex gap-2">
            <Button type="button" size="sm" variant="secondary" onClick={() => setArchive(null)}>
              {t("ui.inspectClear")}
            </Button>
          </div>
        </div>
      ) : null}

      <p className="text-sm text-text-muted">{t("ui.inspectNote")}</p>
    </div>
  );
}
