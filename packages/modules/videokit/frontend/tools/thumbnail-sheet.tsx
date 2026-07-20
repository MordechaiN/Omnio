"use client";

import { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { takePendingFiles } from "@omnio/module-sdk";
import { Button, Label } from "@omnio/ui";

const COLUMNS = 3;
const CELL_W = 384;

/** Thumbnail sheet — N evenly spaced stills tiled into one overview PNG. */
export default function ThumbnailSheetTool() {
  const t = useTranslations("mod-videokit");
  const inputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [source, setSource] = useState<{ name: string; url: string } | null>(null);
  const [count, setCount] = useState(9);
  const [dragOver, setDragOver] = useState(false);
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);

  function open(file: File) {
    setFailed(false);
    setSource((previous) => {
      if (previous) URL.revokeObjectURL(previous.url);
      return { name: file.name, url: URL.createObjectURL(file) };
    });
  }

  useEffect(() => {
    const handed = takePendingFiles()?.[0];
    if (handed) open(handed);
  }, []);

  async function seekTo(video: HTMLVideoElement, time: number): Promise<void> {
    return new Promise((resolve) => {
      const done = () => {
        video.removeEventListener("seeked", done);
        resolve();
      };
      video.addEventListener("seeked", done);
      video.currentTime = time;
    });
  }

  async function generate() {
    const video = videoRef.current;
    if (!video || !source) return;
    setBusy(true);
    setFailed(false);
    try {
      if (Number.isNaN(video.duration) || video.videoWidth === 0) throw new Error("undecodable");
      const cellH = Math.round((CELL_W * video.videoHeight) / video.videoWidth);
      const rows = Math.ceil(count / COLUMNS);
      const canvas = document.createElement("canvas");
      canvas.width = COLUMNS * CELL_W;
      canvas.height = rows * (cellH + 22);
      const context = canvas.getContext("2d");
      if (!context) throw new Error("no context");
      context.fillStyle = "#111111";
      context.fillRect(0, 0, canvas.width, canvas.height);
      context.font = "12px system-ui, sans-serif";

      for (let index = 0; index < count; index += 1) {
        const time = (video.duration * (index + 0.5)) / count;
        await seekTo(video, time);
        const x = (index % COLUMNS) * CELL_W;
        const y = Math.floor(index / COLUMNS) * (cellH + 22);
        context.drawImage(video, x, y, CELL_W, cellH);
        context.fillStyle = "#ffffff";
        const m = Math.floor(time / 60);
        const s = String(Math.round(time - m * 60)).padStart(2, "0");
        context.fillText(`${m}:${s}`, x + 8, y + cellH + 15);
      }
      const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/png"));
      if (blob) {
        const url = URL.createObjectURL(blob);
        const anchor = document.createElement("a");
        anchor.href = url;
        anchor.download = `${source.name.replace(/\.[^.]+$/, "")}-thumbs.png`;
        anchor.click();
        URL.revokeObjectURL(url);
      }
    } catch {
      setFailed(true);
    } finally {
      setBusy(false);
    }
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
          aria-label={t("ui.dropLabel")}
          className="sr-only"
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (file) open(file);
            event.target.value = "";
          }}
        />
      </label>

      {source ? (
        <>
          <video
            ref={videoRef}
            src={source.url}
            preload="metadata"
            muted
            onError={() => setFailed(true)}
            className="mx-auto max-h-56 w-full max-w-xl rounded-lg border border-border-subtle bg-black"
          />
          <div className="flex flex-wrap items-end gap-4">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="th-count">{t("ui.thumbCount", { count })}</Label>
              <input
                id="th-count"
                type="range"
                min={3}
                max={18}
                step={3}
                value={count}
                onChange={(event) => setCount(Number(event.target.value))}
                className="accent-accent"
              />
            </div>
            <Button type="button" onClick={() => void generate()} disabled={busy}>
              {busy ? t("ui.working") : t("ui.thumbGenerate")}
            </Button>
          </div>
          {failed ? (
            <p role="alert" className="text-sm text-danger">{t("ui.errorDecode")}</p>
          ) : null}
          <p className="text-sm text-text-muted">{t("ui.privacy")}</p>
        </>
      ) : null}
    </div>
  );
}
