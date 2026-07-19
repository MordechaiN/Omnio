"use client";

import { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { Badge, Button, Label } from "@omnio/ui";
import { clampTrimRange, encodeWav } from "../../shared/wav.ts";

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds - m * 60;
  return `${m}:${s.toFixed(1).padStart(4, "0")}`;
}

/**
 * Audio trimmer — decode with the Web Audio API, choose a start/end, preview
 * the selection, export 16-bit WAV. Nothing leaves the device.
 */
export default function AudioTrimTool() {
  const t = useTranslations("mod-audiokit");
  const inputRef = useRef<HTMLInputElement>(null);
  const sourceRef = useRef<AudioBufferSourceNode | null>(null);
  const contextRef = useRef<AudioContext | null>(null);
  const [audio, setAudio] = useState<{ name: string; buffer: AudioBuffer } | null>(null);
  const [start, setStart] = useState(0);
  const [end, setEnd] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [failed, setFailed] = useState(false);
  const [dragOver, setDragOver] = useState(false);

  useEffect(
    () => () => {
      sourceRef.current?.stop();
      void contextRef.current?.close();
    },
    [],
  );

  async function open(file: File) {
    setFailed(false);
    stopPreview();
    try {
      contextRef.current ??= new AudioContext();
      const buffer = await contextRef.current.decodeAudioData(await file.arrayBuffer());
      setAudio({ name: file.name, buffer });
      setStart(0);
      setEnd(buffer.duration);
    } catch {
      setFailed(true);
      setAudio(null);
    }
  }

  function stopPreview() {
    sourceRef.current?.stop();
    sourceRef.current = null;
    setPlaying(false);
  }

  function preview() {
    if (!audio || !contextRef.current) return;
    if (playing) {
      stopPreview();
      return;
    }
    const { start: s, end: e } = clampTrimRange(start, end, audio.buffer.duration);
    const source = contextRef.current.createBufferSource();
    source.buffer = audio.buffer;
    source.connect(contextRef.current.destination);
    source.onended = () => setPlaying(false);
    source.start(0, s, Math.max(0.01, e - s));
    sourceRef.current = source;
    setPlaying(true);
  }

  function exportWav() {
    if (!audio) return;
    const { start: s, end: e } = clampTrimRange(start, end, audio.buffer.duration);
    const rate = audio.buffer.sampleRate;
    const from = Math.floor(s * rate);
    const to = Math.floor(e * rate);
    const channels: Float32Array[] = [];
    for (let c = 0; c < audio.buffer.numberOfChannels; c += 1) {
      channels.push(audio.buffer.getChannelData(c).slice(from, to));
    }
    const wav = encodeWav({ channels, sampleRate: rate });
    const url = URL.createObjectURL(new Blob([wav], { type: "audio/wav" }));
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `${audio.name.replace(/\.[^.]+$/, "") || "clip"}-trim.wav`;
    anchor.click();
    URL.revokeObjectURL(url);
  }

  const duration = audio?.buffer.duration ?? 0;
  const range = clampTrimRange(start, end, duration);
  const selection = range.end - range.start;

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
          if (file) void open(file);
        }}
        className={`flex cursor-pointer flex-col items-center justify-center gap-1.5 rounded-xl border-2 border-dashed text-center transition-colors duration-(--motion-fast) ${
          audio ? "px-4 py-3" : "p-8"
        } ${dragOver ? "border-accent bg-accent-subtle" : "border-border hover:border-border-strong"}`}
      >
        <p className="text-sm font-medium">{audio ? t("ui.dropReplace") : t("ui.dropTitle")}</p>
        {!audio ? <p className="text-sm text-text-muted">{t("ui.dropHint")}</p> : null}
        <input
          ref={inputRef}
          type="file"
          accept="audio/*"
          className="sr-only"
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (file) void open(file);
            event.target.value = "";
          }}
        />
      </div>

      {failed ? (
        <p role="alert" className="text-sm text-danger">
          {t("ui.errorDecode")}
        </p>
      ) : null}

      {audio ? (
        <>
          <div className="flex flex-wrap items-center gap-2 text-sm">
            <span dir="ltr" className="max-w-60 truncate font-medium">
              {audio.name}
            </span>
            <Badge variant="neutral">
              <span dir="ltr">{formatTime(duration)}</span>
            </Badge>
            <Badge variant="neutral">
              <span dir="ltr">{audio.buffer.sampleRate} Hz</span>
            </Badge>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="trim-start">
                {t("ui.start", { time: formatTime(range.start) })}
              </Label>
              <input
                id="trim-start"
                type="range"
                min={0}
                max={duration}
                step={0.1}
                value={range.start}
                onChange={(event) => setStart(Number(event.target.value))}
                className="accent-accent"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="trim-end">{t("ui.end", { time: formatTime(range.end) })}</Label>
              <input
                id="trim-end"
                type="range"
                min={0}
                max={duration}
                step={0.1}
                value={range.end}
                onChange={(event) => setEnd(Number(event.target.value))}
                className="accent-accent"
              />
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <Button type="button" variant="secondary" onClick={preview} disabled={selection <= 0}>
              {playing ? t("ui.stop") : t("ui.preview")}
            </Button>
            <Button type="button" onClick={exportWav} disabled={selection <= 0}>
              {t("ui.export", { time: formatTime(selection) })}
            </Button>
          </div>
          <p className="text-sm text-text-muted">{t("ui.privacy")}</p>
        </>
      ) : null}
    </div>
  );
}
