"use client";

import { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { takePendingFiles } from "@omnio/module-sdk";
import { Badge } from "@omnio/ui";
import { averageBitrateKbps, formatDuration, uncompressedBytes } from "../../shared/inspect.ts";

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
}

/**
 * Audio Inspector — how long, how big, how heavily compressed.
 *
 * Video had an inspector and audio did not, so "what actually is this file?"
 * had an answer for one and silence for the other. Facts come from the native
 * media element, which reads the header and stops: no decoding, no waiting, and
 * a two-hour recording answers as fast as a ringtone.
 */
export default function AudioInspectTool() {
  const t = useTranslations("mod-audiokit");
  const inputRef = useRef<HTMLInputElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  const [file, setFile] = useState<{
    name: string;
    size: number;
    type: string;
    url: string;
  } | null>(null);
  const [duration, setDuration] = useState<number | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [failed, setFailed] = useState(false);

  function open(picked: File) {
    setFailed(false);
    setDuration(null);
    setFile((previous) => {
      if (previous) URL.revokeObjectURL(previous.url);
      return {
        name: picked.name,
        size: picked.size,
        type: picked.type,
        url: URL.createObjectURL(picked),
      };
    });
  }

  useEffect(() => {
    const handed = takePendingFiles()?.[0];
    if (handed) open(handed);
  }, []);

  useEffect(() => () => setFile((previous) => (previous && URL.revokeObjectURL(previous.url), null)), []);

  const bitrate = file && duration !== null ? averageBitrateKbps(file.size, duration) : null;
  const raw = duration !== null ? uncompressedBytes(duration) : 0;
  const savedRatio = file && raw > 0 ? file.size / raw : null;

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
          const dropped = event.dataTransfer.files[0];
          if (dropped) open(dropped);
        }}
        className={`flex cursor-pointer items-center justify-center rounded-xl border-2 border-dashed px-4 py-8 text-center text-sm transition-colors duration-(--motion-fast) ${
          dragOver ? "border-accent bg-accent-subtle" : "border-border text-text-muted"
        }`}
      >
        {t("ui.inspectDrop")}
        <input
          ref={inputRef}
          type="file"
          accept="audio/*"
          className="hidden"
          onChange={(event) => {
            const picked = event.target.files?.[0];
            if (picked) open(picked);
          }}
        />
      </label>

      {file ? (
        <>
          <audio
            ref={audioRef}
            src={file.url}
            controls
            preload="metadata"
            onLoadedMetadata={() => setDuration(audioRef.current?.duration ?? null)}
            onError={() => setFailed(true)}
            className="w-full"
          />
          {failed ? (
            <p role="alert" className="text-sm text-danger">
              {t("ui.inspectFailed")}
            </p>
          ) : duration !== null ? (
            <>
              <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                {(
                  [
                    [t("ui.inspectDuration"), formatDuration(duration)],
                    [t("ui.inspectSize"), formatBytes(file.size)],
                    [
                      t("ui.inspectBitrate"),
                      bitrate !== null ? `${bitrate} kbps` : t("ui.inspectUnknown"),
                    ],
                  ] as const
                ).map(([label, value]) => (
                  <div
                    key={label}
                    className="flex flex-col gap-0.5 rounded-lg border border-border-subtle bg-surface p-3"
                  >
                    <dt className="text-xs text-text-muted">{label}</dt>
                    <dd dir="ltr" className="text-start text-sm font-semibold tabular-nums">
                      {value}
                    </dd>
                  </div>
                ))}
                <div className="flex flex-col gap-0.5 rounded-lg border border-border-subtle bg-surface p-3">
                  <dt className="text-xs text-text-muted">{t("ui.inspectFormat")}</dt>
                  <dd dir="ltr" className="text-start text-sm font-semibold">
                    <Badge variant="neutral">{file.type || t("ui.inspectUnknown")}</Badge>
                  </dd>
                </div>
              </dl>
              {savedRatio !== null ? (
                <p className="text-sm text-text-muted">
                  {t("ui.inspectCompared", {
                    raw: formatBytes(raw),
                    percent: Math.max(1, Math.round(savedRatio * 100)),
                  })}
                </p>
              ) : null}
            </>
          ) : null}
          <p className="text-sm text-text-muted">{t("ui.inspectNote")}</p>
        </>
      ) : null}
    </div>
  );
}
