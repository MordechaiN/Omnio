"use client";

import { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { Button, Input, Label } from "@omnio/ui";
import { outputFilename } from "../../shared/resize.ts";
import { centeredAspectCrop, clampCrop, type CropRect } from "../../shared/transform.ts";
import { downloadBlob, ImageDropZone, useImageFile } from "../lib/image-file.tsx";

const PRESETS: Array<{ key: string; ratio: [number, number] | null }> = [
  { key: "free", ratio: null },
  { key: "square", ratio: [1, 1] },
  { key: "fourThree", ratio: [4, 3] },
  { key: "sixteenNine", ratio: [16, 9] },
  { key: "threeTwo", ratio: [3, 2] },
];

/**
 * Crop — aspect presets seed a centered selection; the numbers stay editable
 * and the shaded preview shows exactly what will be kept.
 */
export default function ImageCropTool() {
  const t = useTranslations("mod-imagekit");
  const { image, load, error } = useImageFile();
  const containerRef = useRef<HTMLDivElement>(null);
  const [rect, setRect] = useState<CropRect | null>(null);

  useEffect(() => {
    if (!image) {
      setRect(null);
      return;
    }
    setRect({ x: 0, y: 0, width: image.bitmap.width, height: image.bitmap.height });
  }, [image]);

  const imageSize = image ? { width: image.bitmap.width, height: image.bitmap.height } : null;

  function update(field: keyof CropRect, raw: string) {
    if (!rect || !imageSize) return;
    const value = Number(raw);
    if (!Number.isFinite(value)) return;
    setRect(clampCrop({ ...rect, [field]: value }, imageSize));
  }

  async function download() {
    if (!image || !rect) return;
    const canvas = document.createElement("canvas");
    canvas.width = rect.width;
    canvas.height = rect.height;
    canvas
      .getContext("2d")
      ?.drawImage(image.bitmap, rect.x, rect.y, rect.width, rect.height, 0, 0, rect.width, rect.height);
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/png"));
    if (blob) {
      downloadBlob(blob, outputFilename(image.name, { width: rect.width, height: rect.height }, "image/png"));
    }
  }

  return (
    <div className="flex flex-col gap-5">
      <ImageDropZone image={image} onFile={(file) => void load(file)} error={error} />

      {image && imageSize && rect ? (
        <>
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm text-text-muted">{t("ui.cropPresets")}</span>
            {PRESETS.map((preset) => (
              <Button
                key={preset.key}
                type="button"
                variant="secondary"
                size="sm"
                onClick={() =>
                  setRect(
                    preset.ratio
                      ? centeredAspectCrop(imageSize, preset.ratio[0], preset.ratio[1])
                      : { x: 0, y: 0, ...imageSize },
                  )
                }
              >
                {t(`ui.cropPreset.${preset.key}` as Parameters<typeof t>[0])}
              </Button>
            ))}
          </div>

          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            {(["x", "y", "width", "height"] as const).map((field) => (
              <div key={field} className="flex flex-col gap-1.5">
                <Label htmlFor={`crop-${field}`}>{t(`ui.crop.${field}` as Parameters<typeof t>[0])}</Label>
                <Input
                  id={`crop-${field}`}
                  dir="ltr"
                  type="number"
                  inputMode="numeric"
                  min={0}
                  value={rect[field]}
                  onChange={(event) => update(field, event.target.value)}
                />
              </div>
            ))}
          </div>

          {/* Preview: the kept region stays bright, the discard shades out. */}
          <div ref={containerRef} className="relative mx-auto max-h-96 overflow-hidden rounded-lg border border-border-subtle">
            {/* Plain <img>: local object URL, next/image has nothing to optimize. */}
            <img src={image.previewUrl} alt={t("ui.previewAlt")} className="block max-h-96 w-auto" />
            <div
              aria-hidden="true"
              className="absolute border-2 border-accent shadow-[0_0_0_9999px_rgba(0,0,0,0.55)]"
              style={{
                left: `${(rect.x / imageSize.width) * 100}%`,
                top: `${(rect.y / imageSize.height) * 100}%`,
                width: `${(rect.width / imageSize.width) * 100}%`,
                height: `${(rect.height / imageSize.height) * 100}%`,
              }}
            />
          </div>

          <div>
            <Button type="button" onClick={() => void download()}>
              {t("ui.cropDownload", { width: rect.width, height: rect.height })}
            </Button>
          </div>
          <p className="text-sm text-text-muted">{t("ui.privacy")}</p>
        </>
      ) : null}
    </div>
  );
}
