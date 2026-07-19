"use client";

import { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { Button, Label, Switch } from "@omnio/ui";
import { outputFilename } from "../../shared/resize.ts";
import { sharpenKernel } from "../../shared/transform.ts";
import { downloadBlob, ImageDropZone, useImageFile } from "../lib/image-file.tsx";

function applyConvolution(source: ImageData, kernel: number[]): ImageData {
  const { width, height, data } = source;
  const output = new ImageData(width, height);
  const out = output.data;
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      let r = 0;
      let g = 0;
      let b = 0;
      for (let ky = -1; ky <= 1; ky += 1) {
        for (let kx = -1; kx <= 1; kx += 1) {
          const sy = Math.min(height - 1, Math.max(0, y + ky));
          const sx = Math.min(width - 1, Math.max(0, x + kx));
          const weight = kernel[(ky + 1) * 3 + (kx + 1)]!;
          const offset = (sy * width + sx) * 4;
          r += data[offset]! * weight;
          g += data[offset + 1]! * weight;
          b += data[offset + 2]! * weight;
        }
      }
      const target = (y * width + x) * 4;
      out[target] = r;
      out[target + 1] = g;
      out[target + 2] = b;
      out[target + 3] = data[target + 3]!;
    }
  }
  return output;
}

/** Filters — grayscale, blur, and sharpen with a live preview. */
export default function ImageFiltersTool() {
  const t = useTranslations("mod-imagekit");
  const { image, load, error } = useImageFile();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [grayscale, setGrayscale] = useState(false);
  const [blur, setBlur] = useState(0);
  const [sharpen, setSharpen] = useState(0);
  const [rendering, setRendering] = useState(false);

  useEffect(() => {
    setGrayscale(false);
    setBlur(0);
    setSharpen(0);
  }, [image]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !image) return;
    setRendering(true);
    // Debounce slider drags — the sharpen convolution is O(pixels).
    const timer = setTimeout(() => {
      canvas.width = image.bitmap.width;
      canvas.height = image.bitmap.height;
      const context = canvas.getContext("2d");
      if (!context) return;
      const filters: string[] = [];
      if (grayscale) filters.push("grayscale(1)");
      if (blur > 0) filters.push(`blur(${blur}px)`);
      context.filter = filters.join(" ") || "none";
      context.drawImage(image.bitmap, 0, 0);
      context.filter = "none";
      if (sharpen > 0) {
        const imageData = context.getImageData(0, 0, canvas.width, canvas.height);
        context.putImageData(applyConvolution(imageData, sharpenKernel(sharpen / 100)), 0, 0);
      }
      setRendering(false);
    }, 150);
    return () => clearTimeout(timer);
  }, [image, grayscale, blur, sharpen]);

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

  const dirty = grayscale || blur > 0 || sharpen > 0;

  return (
    <div className="flex flex-col gap-5">
      <ImageDropZone image={image} onFile={(file) => void load(file)} error={error} />

      {image ? (
        <>
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="flex items-center gap-2">
              <Switch id="flt-gray" checked={grayscale} onCheckedChange={setGrayscale} />
              <Label htmlFor="flt-gray">{t("ui.grayscale")}</Label>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="flt-blur">{t("ui.blur", { px: blur })}</Label>
              <input
                id="flt-blur"
                type="range"
                min={0}
                max={20}
                value={blur}
                onChange={(event) => setBlur(Number(event.target.value))}
                className="accent-accent"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="flt-sharpen">{t("ui.sharpen", { percent: sharpen })}</Label>
              <input
                id="flt-sharpen"
                type="range"
                min={0}
                max={100}
                value={sharpen}
                onChange={(event) => setSharpen(Number(event.target.value))}
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
            <Button type="button" onClick={() => void download()} disabled={!dirty || rendering}>
              {t("ui.download")}
            </Button>
          </div>
          <p className="text-sm text-text-muted">{t("ui.privacy")}</p>
        </>
      ) : null}
    </div>
  );
}
