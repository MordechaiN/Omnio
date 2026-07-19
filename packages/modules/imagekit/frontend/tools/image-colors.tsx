"use client";

import { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { Button, toast } from "@omnio/ui";
import { dominantColors, rgbToHex } from "../../shared/transform.ts";
import { ImageDropZone, useImageFile } from "../lib/image-file.tsx";

interface Swatch {
  hex: string;
  share: number;
}

/** Colors — click anywhere to sample a pixel; dominant palette below. */
export default function ImageColorsTool() {
  const t = useTranslations("mod-imagekit");
  const { image, load, error } = useImageFile();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [picked, setPicked] = useState<string | null>(null);
  const [palette, setPalette] = useState<Swatch[]>([]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !image) {
      setPalette([]);
      setPicked(null);
      return;
    }
    canvas.width = image.bitmap.width;
    canvas.height = image.bitmap.height;
    const context = canvas.getContext("2d", { willReadFrequently: true });
    if (!context) return;
    context.drawImage(image.bitmap, 0, 0);
    const data = context.getImageData(0, 0, canvas.width, canvas.height).data;
    setPalette(
      dominantColors(data, 6).map((color) => ({
        hex: rgbToHex(color.r, color.g, color.b),
        share: color.share,
      })),
    );
    setPicked(null);
  }, [image]);

  function pick(event: React.MouseEvent<HTMLCanvasElement>) {
    const canvas = canvasRef.current;
    const context = canvas?.getContext("2d", { willReadFrequently: true });
    if (!canvas || !context) return;
    const rect = canvas.getBoundingClientRect();
    const x = Math.floor(((event.clientX - rect.left) / rect.width) * canvas.width);
    const y = Math.floor(((event.clientY - rect.top) / rect.height) * canvas.height);
    const [r, g, b] = context.getImageData(x, y, 1, 1).data;
    setPicked(rgbToHex(r!, g!, b!));
  }

  function copy(hex: string) {
    void navigator.clipboard.writeText(hex);
    toast(t("ui.copied", { value: hex }));
  }

  return (
    <div className="flex flex-col gap-5">
      <ImageDropZone image={image} onFile={(file) => void load(file)} error={error} />

      {image ? (
        <>
          <div className="overflow-auto rounded-lg border border-border-subtle bg-surface p-3">
            <canvas
              ref={canvasRef}
              role="img"
              aria-label={t("ui.pickAlt")}
              onClick={pick}
              className="mx-auto max-h-96 max-w-full cursor-crosshair object-contain"
            />
          </div>
          <p className="text-sm text-text-muted">{t("ui.pickHint")}</p>

          {picked ? (
            <div className="flex items-center gap-3 rounded-lg border border-border-subtle bg-surface p-3">
              <span
                aria-hidden="true"
                className="size-9 shrink-0 rounded-md border border-border-subtle"
                style={{ backgroundColor: picked }}
              />
              <code dir="ltr" className="font-mono text-sm">
                {picked}
              </code>
              <Button type="button" variant="secondary" size="sm" onClick={() => copy(picked)}>
                {t("ui.copy")}
              </Button>
            </div>
          ) : null}

          {palette.length > 0 ? (
            <section aria-label={t("ui.dominant")} className="flex flex-col gap-2">
              <h2 className="text-sm font-semibold text-text-secondary">{t("ui.dominant")}</h2>
              <ul className="flex flex-wrap gap-2">
                {palette.map((swatch) => (
                  <li key={swatch.hex}>
                    <button
                      type="button"
                      onClick={() => copy(swatch.hex)}
                      aria-label={t("ui.copySwatch", { value: swatch.hex })}
                      className="flex items-center gap-2 rounded-lg border border-border-subtle bg-surface px-2.5 py-1.5 text-sm transition-colors hover:border-border hover:bg-surface-raised"
                    >
                      <span
                        aria-hidden="true"
                        className="size-6 rounded-md border border-border-subtle"
                        style={{ backgroundColor: swatch.hex }}
                      />
                      <code dir="ltr" className="font-mono text-xs">
                        {swatch.hex}
                      </code>
                      <span className="text-xs tabular-nums text-text-muted">
                        {Math.round(swatch.share * 100)}%
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}
          <p className="text-sm text-text-muted">{t("ui.privacy")}</p>
        </>
      ) : null}
    </div>
  );
}
