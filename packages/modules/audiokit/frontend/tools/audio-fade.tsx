"use client";

import { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { takePendingFiles } from "@omnio/module-sdk";
import { Button, Label, Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@omnio/ui";
import { applyFade, type FadeCurve } from "../../shared/fade.ts";
import { encodeWav } from "../../shared/wav.ts";

/** Audio fade in/out — smooth the start and end of a clip, export WAV. */
export default function AudioFadeTool() {
  const t = useTranslations("mod-audiokit");
  const inputRef = useRef<HTMLInputElement>(null);
  const contextRef = useRef<AudioContext | null>(null);
  const [audio, setAudio] = useState<{ name: string; buffer: AudioBuffer } | null>(null);
  const [fadeIn, setFadeIn] = useState(1);
  const [fadeOut, setFadeOut] = useState(1);
  const [curve, setCurve] = useState<FadeCurve>("equalPower");
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

  function download() {
    if (!audio) return;
    const channels: Float32Array[] = [];
    for (let c = 0; c < audio.buffer.numberOfChannels; c += 1) {
      channels.push(
        applyFade(audio.buffer.getChannelData(c), audio.buffer.sampleRate, fadeIn, fadeOut, curve),
      );
    }
    const wav = encodeWav({ channels, sampleRate: audio.buffer.sampleRate });
    const url = URL.createObjectURL(new Blob([wav], { type: "audio/wav" }));
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `${audio.name.replace(/\.[^.]+$/, "") || "clip"}-fade.wav`;
    anchor.click();
    URL.revokeObjectURL(url);
  }

  const maxFade = audio ? audio.buffer.duration / 2 : 10;

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

      {failed ? <p role="alert" className="text-sm text-danger">{t("ui.errorDecode")}</p> : null}

      {audio ? (
        <>
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="fade-in">{t("ui.fadeIn", { seconds: fadeIn.toFixed(1) })}</Label>
              <input
                id="fade-in"
                type="range"
                min={0}
                max={maxFade}
                step={0.1}
                value={fadeIn}
                onChange={(event) => setFadeIn(Number(event.target.value))}
                className="accent-accent"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="fade-out">{t("ui.fadeOut", { seconds: fadeOut.toFixed(1) })}</Label>
              <input
                id="fade-out"
                type="range"
                min={0}
                max={maxFade}
                step={0.1}
                value={fadeOut}
                onChange={(event) => setFadeOut(Number(event.target.value))}
                className="accent-accent"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="fade-curve">{t("ui.fadeCurve")}</Label>
              <Select value={curve} onValueChange={(next) => setCurve(next as FadeCurve)}>
                <SelectTrigger id="fade-curve"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="linear">{t("ui.curveLinear")}</SelectItem>
                  <SelectItem value="equalPower">{t("ui.curveEqualPower")}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div>
            <Button type="button" onClick={download}>{t("ui.fadeDownload")}</Button>
          </div>
          <p className="text-sm text-text-muted">{t("ui.privacy")}</p>
        </>
      ) : null}
    </div>
  );
}
