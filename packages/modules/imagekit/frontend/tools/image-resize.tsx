"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { takePendingFiles } from "@omnio/module-sdk";
import { Badge, Button, Input, Label, Select, SelectContent, SelectItem, SelectTrigger, SelectValue, Switch } from "@omnio/ui";
import { SendTo } from "../lib/send-to.tsx";
import {
  formatBytes,
  isValidDimension,
  lockedDimensions,
  outputFilename,
  OUTPUT_FORMATS,
  type Dimensions,
  type OutputFormat,
} from "../../shared/resize.ts";

interface LoadedImage {
  name: string;
  size: number;
  type: string;
  bitmap: ImageBitmap;
  /** Object URL for the preview thumbnail. */
  previewUrl: string;
}

const FORMAT_LABELS: Record<OutputFormat, string> = {
  "image/png": "PNG",
  "image/jpeg": "JPEG",
  "image/webp": "WebP",
};

/**
 * Image resizer/converter. Everything happens in the browser via
 * createImageBitmap + canvas — the image is never uploaded anywhere.
 */
export default function ImageResizeTool() {
  const t = useTranslations("mod-imagekit");
  const inputRef = useRef<HTMLInputElement>(null);
  const [image, setImage] = useState<LoadedImage | null>(null);
  const [target, setTarget] = useState<Dimensions>({ width: 0, height: 0 });
  const [locked, setLocked] = useState(true);
  const [format, setFormat] = useState<OutputFormat>("image/png");
  const [quality, setQuality] = useState(90);
  const [dragOver, setDragOver] = useState(false);
  const [error, setError] = useState<"unsupported" | "export" | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(
    () => () => {
      if (image) URL.revokeObjectURL(image.previewUrl);
    },
    [image],
  );

  const load = useCallback(async (file: File) => {
    setError(null);
    try {
      const bitmap = await createImageBitmap(file);
      setImage((previous) => {
        if (previous) URL.revokeObjectURL(previous.previewUrl);
        return {
          name: file.name,
          size: file.size,
          type: file.type,
          bitmap,
          previewUrl: URL.createObjectURL(file),
        };
      });
      setTarget({ width: bitmap.width, height: bitmap.height });
    } catch {
      setError("unsupported");
    }
  }, []);

  function updateSide(side: "width" | "height", raw: string) {
    if (!image) return;
    const value = Number(raw);
    if (!Number.isFinite(value)) return;
    const originalSize = { width: image.bitmap.width, height: image.bitmap.height };
    setTarget(
      locked
        ? lockedDimensions(originalSize, side, value)
        : { ...target, [side]: Math.max(1, Math.round(value)) },
    );
  }

  // Universal drop zone hand-off — open the file the shell (or a sibling
  // tool's chain) brought along.
  useEffect(() => {
    const handed = takePendingFiles()?.[0];
    if (handed) void load(handed);
  }, [load]);

  async function produce(): Promise<{ blob: Blob; name: string } | null> {
    if (!image) return null;
    const canvas = document.createElement("canvas");
    canvas.width = target.width;
    canvas.height = target.height;
    const context = canvas.getContext("2d");
    if (!context) return null;
    context.drawImage(image.bitmap, 0, 0, target.width, target.height);
    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, format, format === "image/png" ? undefined : quality / 100),
    );
    return blob ? { blob, name: outputFilename(image.name, target, format) } : null;
  }

  async function download() {
    if (!image) return;
    setBusy(true);
    setError(null);
    try {
      const output = await produce();
      if (!output) throw new Error("encode failed");
      const url = URL.createObjectURL(output.blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = output.name;
      anchor.click();
      URL.revokeObjectURL(url);
    } catch {
      setError("export");
    } finally {
      setBusy(false);
    }
  }

  const valid = isValidDimension(target.width) && isValidDimension(target.height);

  return (
    <div className="flex flex-col gap-5">
      {/* Drop zone / file picker */}
      <div
        role="button"
        tabIndex={0}
        aria-label={t("ui.dropLabel")}
        onClick={() => inputRef.current?.click()}
        onKeyDown={(event) => {
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            inputRef.current?.click();
          }
        }}
        onDragOver={(event) => {
          event.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(event) => {
          event.preventDefault();
          setDragOver(false);
          const file = event.dataTransfer.files[0];
          if (file) void load(file);
        }}
        className={`flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed p-8 text-center transition-colors duration-(--motion-fast) ${
          dragOver ? "border-accent bg-accent-subtle" : "border-border hover:border-border-strong"
        }`}
      >
        <p className="text-sm font-medium">{image ? t("ui.dropReplace") : t("ui.dropTitle")}</p>
        <p className="text-sm text-text-muted">{t("ui.dropHint")}</p>
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          className="sr-only"
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (file) void load(file);
            event.target.value = "";
          }}
        />
      </div>

      {error === "unsupported" ? (
        <p role="alert" className="text-sm text-danger">
          {t("ui.errorUnsupported")}
        </p>
      ) : null}

      {image ? (
        <>
          <div className="flex items-center gap-4 rounded-lg border border-border-subtle bg-surface p-3">
            {/* Plain <img>: the source is a local object URL, so next/image has nothing to optimize. */}
            <img
              src={image.previewUrl}
              alt=""
              className="size-16 shrink-0 rounded-md border border-border-subtle object-cover"
            />
            <div className="flex min-w-0 flex-col gap-1">
              <p dir="ltr" className="truncate text-start text-sm font-medium">
                {image.name}
              </p>
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="neutral">
                  <span dir="ltr">
                    {image.bitmap.width}×{image.bitmap.height}
                  </span>
                </Badge>
                <Badge variant="neutral">{formatBytes(image.size)}</Badge>
              </div>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="img-width">{t("ui.width")}</Label>
              <Input
                id="img-width"
                dir="ltr"
                type="number"
                inputMode="numeric"
                min={1}
                max={20000}
                value={target.width || ""}
                onChange={(event) => updateSide("width", event.target.value)}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="img-height">{t("ui.height")}</Label>
              <Input
                id="img-height"
                dir="ltr"
                type="number"
                inputMode="numeric"
                min={1}
                max={20000}
                value={target.height || ""}
                onChange={(event) => updateSide("height", event.target.value)}
              />
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Switch id="img-lock" checked={locked} onCheckedChange={setLocked} />
            <Label htmlFor="img-lock">{t("ui.lockAspect")}</Label>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="img-format">{t("ui.format")}</Label>
              <Select value={format} onValueChange={(next) => setFormat(next as OutputFormat)}>
                <SelectTrigger id="img-format">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {OUTPUT_FORMATS.map((f) => (
                    <SelectItem key={f} value={f}>
                      {FORMAT_LABELS[f]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {format !== "image/png" ? (
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="img-quality">{t("ui.quality", { quality })}</Label>
                <input
                  id="img-quality"
                  type="range"
                  min={10}
                  max={100}
                  value={quality}
                  onChange={(event) => setQuality(Number(event.target.value))}
                  className="accent-accent"
                />
              </div>
            ) : null}
          </div>

          {!valid ? (
            <p role="alert" className="text-sm text-danger">
              {t("ui.errorDimensions")}
            </p>
          ) : null}
          {error === "export" ? (
            <p role="alert" className="text-sm text-danger">
              {t("ui.errorExport")}
            </p>
          ) : null}

          <div>
            <Button type="button" onClick={() => void download()} disabled={!valid || busy}>
              {busy ? t("ui.working") : t("ui.download")}
            </Button>
          </div>

          {valid ? (
            <SendTo produce={produce} targets={["image-compress", "exif-remove", "image-watermark"]} />
          ) : null}

          <p className="text-sm text-text-muted">{t("ui.privacy")}</p>
        </>
      ) : null}
    </div>
  );
}
