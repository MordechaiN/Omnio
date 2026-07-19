"use client";

import { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { takePendingFiles } from "@omnio/module-sdk";
import { zip, type Zippable } from "fflate";
import { Badge, Button, IconButton } from "@omnio/ui";
import { X } from "lucide-react";

interface Frame {
  id: string;
  time: number;
  blob: Blob;
  url: string;
}

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = (seconds - m * 60).toFixed(1);
  return `${m}:${s.padStart(4, "0")}`;
}

/**
 * Frame extractor — scrub the native player, capture stills as PNG, save one
 * or all (ZIP). Decoding stays in the browser's own video pipeline.
 */
export default function FrameExtractTool() {
  const t = useTranslations("mod-videokit");
  const inputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [source, setSource] = useState<{ name: string; url: string } | null>(null);
  const [frames, setFrames] = useState<Frame[]>([]);
  const [dragOver, setDragOver] = useState(false);
  const [failed, setFailed] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(
    () => () => {
      if (source) URL.revokeObjectURL(source.url);
      frames.forEach((frame) => URL.revokeObjectURL(frame.url));
    },
    // eslint-disable-next-line -- cleanup on unmount only
    [],
  );

  function open(file: File) {
    setFailed(false);
    setFrames([]);
    setSource((previous) => {
      if (previous) URL.revokeObjectURL(previous.url);
      return { name: file.name, url: URL.createObjectURL(file) };
    });
  }

  useEffect(() => {
    const handed = takePendingFiles()?.[0];
    if (handed) open(handed);
  }, []);

  async function capture() {
    const video = videoRef.current;
    if (!video || video.videoWidth === 0) return;
    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext("2d")?.drawImage(video, 0, 0);
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/png"));
    if (!blob) return;
    const frame: Frame = {
      id: crypto.randomUUID().slice(0, 8),
      time: video.currentTime,
      blob,
      url: URL.createObjectURL(blob),
    };
    setFrames((previous) => [...previous, frame]);
  }

  function save(frame: Frame) {
    const anchor = document.createElement("a");
    anchor.href = frame.url;
    anchor.download = `frame-${formatTime(frame.time).replace(":", "m")}s.png`;
    anchor.click();
  }

  async function saveAll() {
    setBusy(true);
    try {
      const payload: Zippable = {};
      for (const frame of frames) {
        payload[`frame-${formatTime(frame.time).replace(":", "m")}s.png`] = new Uint8Array(
          await frame.blob.arrayBuffer(),
        );
      }
      const bytes = await new Promise<Uint8Array>((resolve, reject) =>
        zip(payload, { level: 0 }, (error, data) => (error ? reject(error) : resolve(data))),
      );
      const url = URL.createObjectURL(new Blob([bytes as BlobPart], { type: "application/zip" }));
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = "frames.zip";
      anchor.click();
      URL.revokeObjectURL(url);
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
          const file = event.dataTransfer.files[0];
          if (file) open(file);
        }}
        className={`flex cursor-pointer flex-col items-center justify-center gap-1.5 rounded-xl border-2 border-dashed text-center transition-colors duration-(--motion-fast) ${
          source ? "px-4 py-3" : "p-8"
        } ${dragOver ? "border-accent bg-accent-subtle" : "border-border hover:border-border-strong"}`}
      >
        <p className="text-sm font-medium">{source ? t("ui.dropReplace") : t("ui.dropTitle")}</p>
        {!source ? <p className="text-sm text-text-muted">{t("ui.dropHint")}</p> : null}
        <input
          ref={inputRef}
          type="file"
          accept="video/*"
          className="sr-only"
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (file) open(file);
            event.target.value = "";
          }}
        />
      </div>

      {source ? (
        <>
          <video
            ref={videoRef}
            src={source.url}
            controls
            onError={() => setFailed(true)}
            className="mx-auto max-h-80 w-full max-w-2xl rounded-lg border border-border-subtle bg-black"
          />
          {failed ? (
            <p role="alert" className="text-sm text-danger">
              {t("ui.errorDecode")}
            </p>
          ) : (
            <div className="flex flex-wrap items-center gap-3">
              <Button type="button" onClick={() => void capture()}>
                {t("ui.capture")}
              </Button>
              {frames.length > 0 ? (
                <Button type="button" variant="secondary" disabled={busy} onClick={() => void saveAll()}>
                  {busy ? t("ui.working") : t("ui.saveAll", { count: frames.length })}
                </Button>
              ) : null}
              <span className="text-sm text-text-muted">{t("ui.captureHint")}</span>
            </div>
          )}

          {frames.length > 0 ? (
            <ul className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {frames.map((frame) => (
                <li key={frame.id} className="flex flex-col gap-1.5">
                  <img
                    src={frame.url}
                    alt={t("ui.frameAlt", { time: formatTime(frame.time) })}
                    className="rounded-lg border border-border-subtle"
                  />
                  <div className="flex items-center justify-between gap-1">
                    <Badge variant="neutral">
                      <span dir="ltr">{formatTime(frame.time)}</span>
                    </Badge>
                    <div className="flex items-center gap-1">
                      <Button type="button" variant="ghost" size="sm" onClick={() => save(frame)}>
                        {t("ui.saveFrame")}
                      </Button>
                      <IconButton
                        aria-label={t("ui.removeFrame")}
                        icon={X}
                        size="sm"
                        variant="ghost"
                        onClick={() => {
                          URL.revokeObjectURL(frame.url);
                          setFrames((previous) => previous.filter((f) => f.id !== frame.id));
                        }}
                      />
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          ) : null}
          <p className="text-sm text-text-muted">{t("ui.privacy")}</p>
        </>
      ) : null}
    </div>
  );
}
