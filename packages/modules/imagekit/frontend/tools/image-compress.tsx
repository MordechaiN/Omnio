"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Badge, Button, Label, Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@omnio/ui";
import { formatBytes, outputFilename, type OutputFormat } from "../../shared/resize.ts";
import { downloadBlob, ImageDropZone, useImageFile } from "../lib/image-file.tsx";
import { SendTo } from "../lib/send-to.tsx";

const LOSSY: Array<Exclude<OutputFormat, "image/png">> = ["image/jpeg", "image/webp"];

/**
 * Compress — re-encode at a chosen quality, dimensions untouched. The output
 * size updates live so the size/quality trade-off is visible before saving.
 */
export default function ImageCompressTool() {
  const t = useTranslations("mod-imagekit");
  const { image, load, error } = useImageFile();
  const [format, setFormat] = useState<(typeof LOSSY)[number]>("image/webp");
  const [quality, setQuality] = useState(75);
  const [result, setResult] = useState<Blob | null>(null);
  const [encoding, setEncoding] = useState(false);

  useEffect(() => {
    if (!image) {
      setResult(null);
      return;
    }
    let cancelled = false;
    setEncoding(true);
    const timer = setTimeout(() => {
      const canvas = document.createElement("canvas");
      canvas.width = image.bitmap.width;
      canvas.height = image.bitmap.height;
      canvas.getContext("2d")?.drawImage(image.bitmap, 0, 0);
      canvas.toBlob(
        (blob) => {
          if (!cancelled) {
            setResult(blob);
            setEncoding(false);
          }
        },
        format,
        quality / 100,
      );
    }, 150); // debounce slider drags
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [image, format, quality]);

  const savings =
    image && result && image.size > 0 ? Math.round((1 - result.size / image.size) * 100) : 0;

  return (
    <div className="flex flex-col gap-5">
      <ImageDropZone image={image} onFile={(file) => void load(file)} error={error} />

      {image ? (
        <>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="cmp-format">{t("ui.format")}</Label>
              <Select value={format} onValueChange={(next) => setFormat(next as (typeof LOSSY)[number])}>
                <SelectTrigger id="cmp-format">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {LOSSY.map((value) => (
                    <SelectItem key={value} value={value}>
                      {value === "image/webp" ? "WebP" : "JPEG"}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="cmp-quality">{t("ui.quality", { quality })}</Label>
              <input
                id="cmp-quality"
                type="range"
                min={10}
                max={100}
                value={quality}
                onChange={(event) => setQuality(Number(event.target.value))}
                className="accent-accent"
              />
            </div>
          </div>

          <div
            aria-live="polite"
            className="flex flex-wrap items-center gap-3 rounded-lg border border-border-subtle bg-surface p-4 text-sm"
          >
            <span className="text-text-muted">{t("ui.original")}</span>
            <Badge variant="neutral">{formatBytes(image.size)}</Badge>
            <span aria-hidden="true" className="text-text-disabled">
              →
            </span>
            <span className="text-text-muted">{t("ui.compressed")}</span>
            {encoding || !result ? (
              <Badge variant="neutral">…</Badge>
            ) : (
              <>
                <Badge variant="neutral">{formatBytes(result.size)}</Badge>
                <Badge variant={savings > 0 ? "accent" : "neutral"}>
                  {t("ui.savings", { percent: savings })}
                </Badge>
              </>
            )}
          </div>

          <div>
            <Button
              type="button"
              disabled={!result || encoding}
              onClick={() => {
                if (result) {
                  downloadBlob(
                    result,
                    outputFilename(
                      image.name,
                      { width: image.bitmap.width, height: image.bitmap.height },
                      format,
                    ),
                  );
                }
              }}
            >
              {t("ui.download")}
            </Button>
          </div>

          {result ? (
            <SendTo
              produce={() =>
                Promise.resolve(
                  result
                    ? {
                        blob: result,
                        name: outputFilename(
                          image.name,
                          { width: image.bitmap.width, height: image.bitmap.height },
                          format,
                        ),
                      }
                    : null,
                )
              }
              targets={["image-resize", "exif-remove", "image-watermark"]}
              original={image.file}
            />
          ) : null}
          <p className="text-sm text-text-muted">{t("ui.privacy")}</p>
        </>
      ) : null}
    </div>
  );
}
