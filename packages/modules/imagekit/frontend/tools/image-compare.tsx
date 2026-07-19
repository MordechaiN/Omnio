"use client";

import { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { Badge, Label } from "@omnio/ui";
import { formatBytes } from "../../shared/resize.ts";
import { ImageDropZone, useImageFile } from "../lib/image-file.tsx";

/**
 * Compare — two images overlaid with a draggable divider (a plain range input,
 * so it's keyboard- and screen-reader-accessible for free).
 */
export default function ImageCompareTool() {
  const t = useTranslations("mod-imagekit");
  const first = useImageFile();
  const second = useImageFile();
  const [split, setSplit] = useState(50);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => setSplit(50), [first.image, second.image]);

  return (
    <div className="flex flex-col gap-5">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-2">
          <p className="text-sm font-medium">{t("ui.compareFirst")}</p>
          <ImageDropZone
            image={first.image}
            onFile={(file) => void first.load(file)}
            error={first.error}
          />
        </div>
        <div className="flex flex-col gap-2">
          <p className="text-sm font-medium">{t("ui.compareSecond")}</p>
          <ImageDropZone
            image={second.image}
            onFile={(file) => void second.load(file)}
            error={second.error}
          />
        </div>
      </div>

      {first.image && second.image ? (
        <>
          <div
            ref={containerRef}
            className="relative mx-auto w-full max-w-3xl overflow-hidden rounded-lg border border-border-subtle"
          >
            {/* Plain <img>: local object URLs, nothing for next/image to optimize. */}
            <img src={first.image.previewUrl} alt={t("ui.compareFirst")} className="block w-full" />
            <div
              aria-hidden="true"
              className="absolute inset-0"
              style={{ clipPath: `inset(0 0 0 ${split}%)` }}
            >
              <img
                src={second.image.previewUrl}
                alt=""
                className="block h-full w-full object-cover"
              />
            </div>
            <div
              aria-hidden="true"
              className="absolute inset-y-0 w-0.5 bg-accent"
              style={{ left: `${split}%` }}
            />
          </div>

          <div className="mx-auto flex w-full max-w-3xl flex-col gap-1.5">
            <Label htmlFor="cmp-split">{t("ui.compareSlider")}</Label>
            <input
              id="cmp-split"
              type="range"
              min={0}
              max={100}
              value={split}
              onChange={(event) => setSplit(Number(event.target.value))}
              className="accent-accent"
            />
          </div>

          <div className="flex flex-wrap items-center justify-center gap-3 text-sm">
            <Badge variant="neutral">
              <span dir="ltr">
                {first.image.bitmap.width}×{first.image.bitmap.height} · {formatBytes(first.image.size)}
              </span>
            </Badge>
            <span aria-hidden="true" className="text-text-disabled">
              ↔
            </span>
            <Badge variant="neutral">
              <span dir="ltr">
                {second.image.bitmap.width}×{second.image.bitmap.height} · {formatBytes(second.image.size)}
              </span>
            </Badge>
          </div>
          <p className="text-sm text-text-muted">{t("ui.privacy")}</p>
        </>
      ) : null}
    </div>
  );
}
