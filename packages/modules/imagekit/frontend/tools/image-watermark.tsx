"use client";

import { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { Button, Input, Label, Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@omnio/ui";
import { outputFilename } from "../../shared/resize.ts";
import { downloadBlob, ImageDropZone, useImageFile } from "../lib/image-file.tsx";

const POSITIONS = ["bottomEnd", "bottomStart", "topEnd", "topStart", "center"] as const;
type Position = (typeof POSITIONS)[number];

/** Watermark — overlay text on an image with position, size, and opacity. */
export default function ImageWatermarkTool() {
  const t = useTranslations("mod-imagekit");
  const { image, load, error } = useImageFile();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [text, setText] = useState("© Omnio");
  const [position, setPosition] = useState<Position>("bottomEnd");
  const [sizePercent, setSizePercent] = useState(5);
  const [opacity, setOpacity] = useState(70);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !image) return;
    const { width, height } = image.bitmap;
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext("2d");
    if (!context) return;
    context.drawImage(image.bitmap, 0, 0);
    if (text.trim() === "") return;

    const fontSize = Math.max(10, Math.round((height * sizePercent) / 100));
    const margin = Math.round(fontSize * 0.6);
    context.font = `600 ${fontSize}px system-ui, sans-serif`;
    context.globalAlpha = opacity / 100;
    // White text with a dark shadow stays readable on any background.
    context.shadowColor = "rgba(0,0,0,0.6)";
    context.shadowBlur = fontSize / 6;
    context.fillStyle = "#ffffff";

    const x = position.endsWith("End") ? width - margin : position === "center" ? width / 2 : margin;
    const y = position.startsWith("bottom")
      ? height - margin
      : position === "center"
        ? height / 2
        : margin + fontSize;
    context.textAlign = position === "center" ? "center" : position.endsWith("End") ? "right" : "left";
    context.fillText(text, x, y);
    context.globalAlpha = 1;
    context.shadowBlur = 0;
  }, [image, text, position, sizePercent, opacity]);

  async function download() {
    const canvas = canvasRef.current;
    if (!canvas || !image) return;
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/png"));
    if (blob) {
      downloadBlob(
        blob,
        outputFilename(image.name, { width: canvas.width, height: canvas.height }, "image/png"),
      );
    }
  }

  return (
    <div className="flex flex-col gap-5">
      <ImageDropZone image={image} onFile={(file) => void load(file)} error={error} />

      {image ? (
        <>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="wm-text">{t("ui.wmText")}</Label>
              <Input id="wm-text" value={text} onChange={(event) => setText(event.target.value)} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="wm-position">{t("ui.wmPosition")}</Label>
              <Select value={position} onValueChange={(next) => setPosition(next as Position)}>
                <SelectTrigger id="wm-position">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {POSITIONS.map((value) => (
                    <SelectItem key={value} value={value}>
                      {t(`ui.wmPositions.${value}` as Parameters<typeof t>[0])}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="wm-size">{t("ui.wmSize", { percent: sizePercent })}</Label>
              <input
                id="wm-size"
                type="range"
                min={2}
                max={15}
                value={sizePercent}
                onChange={(event) => setSizePercent(Number(event.target.value))}
                className="accent-accent"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="wm-opacity">{t("ui.wmOpacity", { percent: opacity })}</Label>
              <input
                id="wm-opacity"
                type="range"
                min={10}
                max={100}
                value={opacity}
                onChange={(event) => setOpacity(Number(event.target.value))}
                className="accent-accent"
              />
            </div>
          </div>

          <div className="overflow-auto rounded-lg border border-border-subtle bg-surface p-3">
            <canvas
              ref={canvasRef}
              role="img"
              aria-label={t("ui.previewAlt")}
              className="mx-auto max-h-96 max-w-full object-contain"
            />
          </div>

          <div>
            <Button type="button" onClick={() => void download()} disabled={text.trim() === ""}>
              {t("ui.download")}
            </Button>
          </div>
          <p className="text-sm text-text-muted">{t("ui.privacy")}</p>
        </>
      ) : null}
    </div>
  );
}
