"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Alert, AlertDescription, Button, Label, Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@omnio/ui";
import { outputFilename, type OutputFormat } from "../../shared/resize.ts";
import { downloadBlob, ImageDropZone, useImageFile } from "../lib/image-file.tsx";

/**
 * EXIF remover — re-encodes through a canvas, which by construction carries
 * zero metadata (no EXIF, GPS, camera, or editing history) into the output.
 */
export default function ExifRemoveTool() {
  const t = useTranslations("mod-imagekit");
  const { image, load, error } = useImageFile();
  const [format, setFormat] = useState<OutputFormat>("image/jpeg");
  const [busy, setBusy] = useState(false);

  async function download() {
    if (!image) return;
    setBusy(true);
    try {
      const canvas = document.createElement("canvas");
      canvas.width = image.bitmap.width;
      canvas.height = image.bitmap.height;
      canvas.getContext("2d")?.drawImage(image.bitmap, 0, 0);
      const blob = await new Promise<Blob | null>((resolve) =>
        canvas.toBlob(resolve, format, format === "image/png" ? undefined : 0.92),
      );
      if (blob) {
        downloadBlob(
          blob,
          outputFilename(
            image.name,
            { width: canvas.width, height: canvas.height },
            format,
          ).replace(/(-\d+x\d+)/, "-clean$1"),
        );
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col gap-5">
      <ImageDropZone image={image} onFile={(file) => void load(file)} error={error} />

      {image ? (
        <>
          <Alert>
            <AlertDescription>{t("ui.exifHow")}</AlertDescription>
          </Alert>

          <div className="flex max-w-xs flex-col gap-1.5">
            <Label htmlFor="exif-format">{t("ui.format")}</Label>
            <Select value={format} onValueChange={(next) => setFormat(next as OutputFormat)}>
              <SelectTrigger id="exif-format">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="image/jpeg">JPEG</SelectItem>
                <SelectItem value="image/png">PNG</SelectItem>
                <SelectItem value="image/webp">WebP</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Button type="button" onClick={() => void download()} disabled={busy}>
              {busy ? t("ui.working") : t("ui.exifDownload")}
            </Button>
          </div>
          <p className="text-sm text-text-muted">{t("ui.privacy")}</p>
        </>
      ) : null}
    </div>
  );
}
