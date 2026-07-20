"use client";

import { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { simulateColorBlindness, type ColorBlindnessType } from "../../shared/analysis.ts";
import { ImageDropZone, useImageFile } from "../lib/image-file.tsx";

const TYPES: ColorBlindnessType[] = ["protanopia", "deuteranopia", "tritanopia"];

/** Color blindness simulator — see an image the way common CVD types would. */
export default function ColorBlindnessTool() {
  const t = useTranslations("mod-imagekit");
  const { image, load, error } = useImageFile();
  const originalRef = useRef<HTMLCanvasElement>(null);
  const canvasRefs = useRef<Record<ColorBlindnessType, HTMLCanvasElement | null>>({
    protanopia: null,
    deuteranopia: null,
    tritanopia: null,
  });
  const [rendered, setRendered] = useState(false);

  useEffect(() => {
    if (!image) {
      setRendered(false);
      return;
    }
    const source = document.createElement("canvas");
    source.width = image.bitmap.width;
    source.height = image.bitmap.height;
    const sourceCtx = source.getContext("2d", { willReadFrequently: true });
    if (!sourceCtx) return;
    sourceCtx.drawImage(image.bitmap, 0, 0);
    const data = sourceCtx.getImageData(0, 0, source.width, source.height);

    if (originalRef.current) {
      originalRef.current.width = source.width;
      originalRef.current.height = source.height;
      originalRef.current.getContext("2d")?.drawImage(image.bitmap, 0, 0);
    }
    for (const type of TYPES) {
      const canvas = canvasRefs.current[type];
      if (!canvas) continue;
      canvas.width = source.width;
      canvas.height = source.height;
      const context = canvas.getContext("2d");
      if (!context) continue;
      const simulated = simulateColorBlindness(data.data, type);
      const imageData = new ImageData(source.width, source.height);
      imageData.data.set(simulated);
      context.putImageData(imageData, 0, 0);
    }
    setRendered(true);
  }, [image]);

  return (
    <div className="flex flex-col gap-5">
      <ImageDropZone image={image} onFile={(file) => void load(file)} error={error} />

      {image ? (
        <div className="grid gap-4 sm:grid-cols-2">
          <figure className="flex flex-col gap-1.5">
            <canvas ref={originalRef} className="w-full rounded-lg border border-border-subtle" />
            <figcaption className="text-sm text-text-muted">{t("ui.cbOriginal")}</figcaption>
          </figure>
          {TYPES.map((type) => (
            <figure key={type} className="flex flex-col gap-1.5">
              <canvas
                ref={(el: HTMLCanvasElement | null) => {
                  canvasRefs.current[type] = el;
                }}
                className="w-full rounded-lg border border-border-subtle"
              />
              <figcaption className="text-sm text-text-muted">
                {t(`ui.cbType.${type}` as Parameters<typeof t>[0])}
              </figcaption>
            </figure>
          ))}
        </div>
      ) : null}
      {rendered ? <p className="text-sm text-text-muted">{t("ui.privacy")}</p> : null}
    </div>
  );
}
