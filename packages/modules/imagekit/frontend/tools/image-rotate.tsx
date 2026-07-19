"use client";

import { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@omnio/ui";
import { outputFilename } from "../../shared/resize.ts";
import { rotatedDimensions, type Rotation } from "../../shared/transform.ts";
import { downloadBlob, ImageDropZone, useImageFile } from "../lib/image-file.tsx";

/** Rotate and flip — quarter-turn rotation plus horizontal/vertical mirror. */
export default function ImageRotateTool() {
  const t = useTranslations("mod-imagekit");
  const { image, load, error } = useImageFile();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [rotation, setRotation] = useState<Rotation>(0);
  const [flipH, setFlipH] = useState(false);
  const [flipV, setFlipV] = useState(false);

  useEffect(() => {
    setRotation(0);
    setFlipH(false);
    setFlipV(false);
  }, [image]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !image) return;
    const source = { width: image.bitmap.width, height: image.bitmap.height };
    const target = rotatedDimensions(source, rotation);
    canvas.width = target.width;
    canvas.height = target.height;
    const context = canvas.getContext("2d");
    if (!context) return;
    context.save();
    context.translate(target.width / 2, target.height / 2);
    context.rotate((rotation * Math.PI) / 180);
    context.scale(flipH ? -1 : 1, flipV ? -1 : 1);
    context.drawImage(image.bitmap, -source.width / 2, -source.height / 2);
    context.restore();
  }, [image, rotation, flipH, flipV]);

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

  const dirty = rotation !== 0 || flipH || flipV;

  return (
    <div className="flex flex-col gap-5">
      <ImageDropZone image={image} onFile={(file) => void load(file)} error={error} />

      {image ? (
        <>
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => setRotation(((rotation + 270) % 360) as Rotation)}
            >
              {t("ui.rotateCcw")}
            </Button>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => setRotation(((rotation + 90) % 360) as Rotation)}
            >
              {t("ui.rotateCw")}
            </Button>
            <Button
              type="button"
              variant={flipH ? "primary" : "secondary"}
              size="sm"
              aria-pressed={flipH}
              onClick={() => setFlipH(!flipH)}
            >
              {t("ui.flipH")}
            </Button>
            <Button
              type="button"
              variant={flipV ? "primary" : "secondary"}
              size="sm"
              aria-pressed={flipV}
              onClick={() => setFlipV(!flipV)}
            >
              {t("ui.flipV")}
            </Button>
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
            <Button type="button" onClick={() => void download()} disabled={!dirty}>
              {t("ui.download")}
            </Button>
          </div>
          <p className="text-sm text-text-muted">{t("ui.privacy")}</p>
        </>
      ) : null}
    </div>
  );
}
