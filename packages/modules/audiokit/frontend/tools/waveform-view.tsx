"use client";

import { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { takePendingFiles } from "@omnio/module-sdk";

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.round(seconds - m * 60);
  return `${m}:${String(s).padStart(2, "0")}`;
}

/** Waveform viewer — decode audio and render its peak amplitude, on your device. */
export default function WaveformViewTool() {
  const t = useTranslations("mod-audiokit");
  const inputRef = useRef<HTMLInputElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const contextRef = useRef<AudioContext | null>(null);
  const [audio, setAudio] = useState<{ name: string; buffer: AudioBuffer } | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [failed, setFailed] = useState(false);

  async function open(file: File) {
    setFailed(false);
    try {
      contextRef.current ??= new AudioContext();
      const buffer = await contextRef.current.decodeAudioData(await file.arrayBuffer());
      setAudio({ name: file.name, buffer });
    } catch {
      setFailed(true);
      setAudio(null);
    }
  }

  useEffect(() => {
    const handed = takePendingFiles()?.[0];
    if (handed) void open(handed);
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !audio) return;
    const dpr = window.devicePixelRatio || 1;
    const width = canvas.clientWidth || 640;
    const height = 160;
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    const context = canvas.getContext("2d");
    if (!context) return;
    context.scale(dpr, dpr);
    context.clearRect(0, 0, width, height);

    const data = audio.buffer.getChannelData(0);
    const samplesPerPixel = Math.max(1, Math.floor(data.length / width));
    const mid = height / 2;
    context.strokeStyle = "currentColor";
    context.lineWidth = 1;
    for (let x = 0; x < width; x += 1) {
      let min = 1;
      let max = -1;
      const start = x * samplesPerPixel;
      for (let i = 0; i < samplesPerPixel; i += 1) {
        const sample = data[start + i] ?? 0;
        if (sample < min) min = sample;
        if (sample > max) max = sample;
      }
      context.beginPath();
      context.moveTo(x, mid + min * mid);
      context.lineTo(x, mid + max * mid);
      context.stroke();
    }
  }, [audio]);

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
          audio ? "px-4 py-3" : "p-8"
        } ${dragOver ? "border-accent bg-accent-subtle" : "border-border hover:border-border-strong"}`}
      >
        <p className="text-sm font-medium">{audio ? t("ui.dropReplace") : t("ui.dropTitle")}</p>
        {!audio ? <p className="text-sm text-text-muted">{t("ui.dropHint")}</p> : null}
        <input
          ref={inputRef}
          type="file"
          accept="audio/*"
          aria-label={t("ui.dropLabel")}
          className="sr-only"
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (file) void open(file);
            event.target.value = "";
          }}
        />
      </label>

      {failed ? (
        <p role="alert" className="text-sm text-danger">{t("ui.errorDecode")}</p>
      ) : null}

      {audio ? (
        <>
          <canvas
            ref={canvasRef}
            role="img"
            aria-label={t("ui.waveformAlt", { name: audio.name, duration: formatTime(audio.buffer.duration) })}
            className="w-full text-accent"
            style={{ height: 160 }}
          />
          <p className="text-sm text-text-muted">
            {formatTime(audio.buffer.duration)} · {audio.buffer.sampleRate} Hz · {audio.buffer.numberOfChannels === 1 ? t("ui.mono") : t("ui.stereo")}
          </p>
        </>
      ) : null}
    </div>
  );
}
