"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { zip, type Zippable } from "fflate";
import { Button } from "@omnio/ui";
import { downloadBlob, ImageDropZone, useImageFile } from "../lib/image-file.tsx";

const SIZES = [16, 32, 48, 180, 192, 512] as const;

/**
 * Favicon generator — one square-ish source image becomes the full favicon
 * set (16–512px PNGs) plus a ready-to-paste HTML snippet, zipped.
 */
export default function FaviconGenerateTool() {
  const t = useTranslations("mod-imagekit");
  const { image, load, error } = useImageFile();
  const [busy, setBusy] = useState(false);

  async function generate() {
    if (!image) return;
    setBusy(true);
    try {
      const payload: Zippable = {};
      for (const size of SIZES) {
        const canvas = document.createElement("canvas");
        canvas.width = size;
        canvas.height = size;
        const context = canvas.getContext("2d");
        if (!context) continue;
        // Center-crop to square, then scale.
        const side = Math.min(image.bitmap.width, image.bitmap.height);
        const sx = (image.bitmap.width - side) / 2;
        const sy = (image.bitmap.height - side) / 2;
        context.drawImage(image.bitmap, sx, sy, side, side, 0, 0, size, size);
        const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/png"));
        if (blob) {
          const name =
            size === 180 ? "apple-touch-icon.png" : `favicon-${size}x${size}.png`;
          payload[name] = new Uint8Array(await blob.arrayBuffer());
        }
      }
      payload["snippet.html"] = new TextEncoder().encode(
        [
          '<link rel="icon" type="image/png" sizes="32x32" href="/favicon-32x32.png">',
          '<link rel="icon" type="image/png" sizes="16x16" href="/favicon-16x16.png">',
          '<link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png">',
          '<link rel="icon" type="image/png" sizes="192x192" href="/favicon-192x192.png">',
        ].join("\n"),
      );
      const bytes = await new Promise<Uint8Array>((resolve, reject) =>
        zip(payload, { level: 6 }, (err, data) => (err ? reject(err) : resolve(data))),
      );
      downloadBlob(new Blob([bytes as BlobPart], { type: "application/zip" }), "favicons.zip");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col gap-5">
      <ImageDropZone image={image} onFile={(file) => void load(file)} error={error} />

      {image ? (
        <>
          <div className="flex flex-wrap items-end gap-3">
            {SIZES.slice(0, 4).map((size) => (
              <div key={size} className="flex flex-col items-center gap-1">
                {/* Local object URL preview at target size. */}
                <img
                  src={image.previewUrl}
                  alt=""
                  width={size > 48 ? 48 : size}
                  height={size > 48 ? 48 : size}
                  className="rounded-sm border border-border-subtle object-cover"
                  style={{ width: Math.min(size, 48), height: Math.min(size, 48) }}
                />
                <span className="text-xs tabular-nums text-text-muted">{size}px</span>
              </div>
            ))}
          </div>
          <p className="text-sm text-text-muted">{t("ui.faviconExplain")}</p>
          <div>
            <Button type="button" onClick={() => void generate()} disabled={busy}>
              {busy ? t("ui.working") : t("ui.faviconDownload")}
            </Button>
          </div>
          <p className="text-sm text-text-muted">{t("ui.privacy")}</p>
        </>
      ) : null}
    </div>
  );
}
