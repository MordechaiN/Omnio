"use client";

import { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { computeHistogram, type Histogram } from "../../shared/analysis.ts";
import { ImageDropZone, useImageFile } from "../lib/image-file.tsx";

const CHANNELS: Array<{ key: keyof Histogram; color: string }> = [
  { key: "luminance", color: "#888888" },
  { key: "red", color: "#e05555" },
  { key: "green", color: "#4caf6f" },
  { key: "blue", color: "#4d7fd6" },
];

function ChannelChart({ values, color }: { values: number[]; color: string }) {
  const max = Math.max(1, ...values);
  const width = 256;
  const height = 96;
  const points = values
    .map((value, index) => `${index},${height - (value / max) * height}`)
    .join(" L");
  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="h-24 w-full" role="img" aria-hidden="true">
      <polyline
        points={`0,${height} L${points} L${width - 1},${height}`}
        fill={color}
        fillOpacity={0.25}
        stroke={color}
        strokeWidth={1}
      />
    </svg>
  );
}

/** Histogram — per-channel tonal distribution of an image, computed locally. */
export default function ImageHistogramTool() {
  const t = useTranslations("mod-imagekit");
  const { image, load, error } = useImageFile();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [histogram, setHistogram] = useState<Histogram | null>(null);

  useEffect(() => {
    if (!image) {
      setHistogram(null);
      return;
    }
    const canvas = canvasRef.current ?? document.createElement("canvas");
    canvas.width = image.bitmap.width;
    canvas.height = image.bitmap.height;
    const context = canvas.getContext("2d", { willReadFrequently: true });
    if (!context) return;
    context.drawImage(image.bitmap, 0, 0);
    const data = context.getImageData(0, 0, canvas.width, canvas.height).data;
    setHistogram(computeHistogram(data));
  }, [image]);

  return (
    <div className="flex flex-col gap-5">
      <ImageDropZone image={image} onFile={(file) => void load(file)} error={error} />
      <canvas ref={canvasRef} className="hidden" aria-hidden="true" />

      {histogram ? (
        <dl className="grid gap-4 sm:grid-cols-2">
          {CHANNELS.map(({ key, color }) => (
            <div key={key} className="flex flex-col gap-1.5 rounded-lg border border-border-subtle bg-surface p-3">
              <dt className="text-sm font-medium" style={{ color }}>
                {t(`ui.channel.${key}` as Parameters<typeof t>[0])}
              </dt>
              <dd>
                <ChannelChart values={histogram[key]} color={color} />
              </dd>
            </div>
          ))}
        </dl>
      ) : null}
      {image ? <p className="text-sm text-text-muted">{t("ui.privacy")}</p> : null}
    </div>
  );
}
