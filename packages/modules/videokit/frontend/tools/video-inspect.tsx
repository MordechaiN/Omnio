"use client";

import { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { takePendingFiles } from "@omnio/module-sdk";
import { Badge } from "@omnio/ui";

function formatDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  return h > 0
    ? `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`
    : `${m}:${String(s).padStart(2, "0")}`;
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function gcd(a: number, b: number): number {
  return b === 0 ? a : gcd(b, a % b);
}

/**
 * Video Inspector — duration, resolution, aspect ratio, frame rate (when the
 * browser exposes it), file size, and container type, read from the native
 * media element. Covers both "metadata" and "resolution" needs in one honest
 * surface rather than shipping two near-duplicate tools.
 */
export default function VideoInspectTool() {
  const t = useTranslations("mod-videokit");
  const inputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [file, setFile] = useState<{ name: string; size: number; type: string; url: string } | null>(null);
  const [facts, setFacts] = useState<{ duration: number; width: number; height: number } | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [failed, setFailed] = useState(false);

  function open(picked: File) {
    setFailed(false);
    setFacts(null);
    setFile((previous) => {
      if (previous) URL.revokeObjectURL(previous.url);
      return { name: picked.name, size: picked.size, type: picked.type, url: URL.createObjectURL(picked) };
    });
  }

  useEffect(() => {
    const handed = takePendingFiles()?.[0];
    if (handed) open(handed);
  }, []);

  function onLoadedMetadata() {
    const video = videoRef.current;
    if (!video) return;
    // Frame rate isn't reliably exposed without decoding actual frames
    // (requestVideoFrameCallback needs playback), so it's left out rather
    // than shown as a shaky guess.
    setFacts({ duration: video.duration, width: video.videoWidth, height: video.videoHeight });
  }

  const ratio = facts ? gcd(facts.width, facts.height) : 0;

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
          const picked = event.dataTransfer.files[0];
          if (picked) open(picked);
        }}
        className={`flex cursor-pointer flex-col items-center justify-center gap-1.5 rounded-xl border-2 border-dashed text-center transition-colors duration-(--motion-fast) ${
          file ? "px-4 py-3" : "p-8"
        } ${dragOver ? "border-accent bg-accent-subtle" : "border-border hover:border-border-strong"}`}
      >
        <p className="text-sm font-medium">{file ? t("ui.dropReplace") : t("ui.dropTitle")}</p>
        {!file ? <p className="text-sm text-text-muted">{t("ui.dropHint")}</p> : null}
        <input
          ref={inputRef}
          type="file"
          accept="video/*"
          aria-label={t("ui.dropLabel")}
          className="sr-only"
          onChange={(event) => {
            const picked = event.target.files?.[0];
            if (picked) open(picked);
            event.target.value = "";
          }}
        />
      </label>

      {file ? (
        <>
          <video
            ref={videoRef}
            src={file.url}
            muted
            preload="metadata"
            onLoadedMetadata={onLoadedMetadata}
            onError={() => setFailed(true)}
            className="mx-auto max-h-64 w-full max-w-xl rounded-lg border border-border-subtle bg-black"
          />
          {failed ? (
            <p role="alert" className="text-sm text-danger">{t("ui.errorDecode")}</p>
          ) : facts ? (
            <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {(
                [
                  [t("ui.duration"), formatDuration(facts.duration)],
                  [t("ui.resolution"), `${facts.width}×${facts.height}`],
                  [t("ui.aspectRatio"), `${facts.width / ratio}:${facts.height / ratio}`],
                  [t("ui.fileSize"), formatBytes(file.size)],
                ] as const
              ).map(([label, value]) => (
                <div key={label} className="flex flex-col gap-0.5 rounded-lg border border-border-subtle bg-surface p-3">
                  <dt className="text-xs text-text-muted">{label}</dt>
                  <dd dir="ltr" className="text-start text-sm font-semibold tabular-nums">{value}</dd>
                </div>
              ))}
              <div className="flex flex-col gap-0.5 rounded-lg border border-border-subtle bg-surface p-3">
                <dt className="text-xs text-text-muted">{t("ui.container")}</dt>
                <dd dir="ltr" className="text-start text-sm font-semibold">
                  <Badge variant="neutral">{file.type || t("ui.unknown")}</Badge>
                </dd>
              </div>
            </dl>
          ) : null}
          <p className="text-sm text-text-muted">{t("ui.privacy")}</p>
        </>
      ) : null}
    </div>
  );
}
