"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Button, Select, SelectContent, SelectItem, SelectTrigger, SelectValue, Textarea, toast } from "@omnio/ui";
import { dominantColors, rgbToHex } from "../../shared/transform.ts";
import { formatPalette, type PaletteFormat } from "../../shared/analysis.ts";
import { ImageDropZone, useImageFile } from "../lib/image-file.tsx";

const FORMATS: PaletteFormat[] = ["css", "scss", "json", "hex"];

/** Palette export — dominant colors extracted and formatted for code. */
export default function PaletteExportTool() {
  const t = useTranslations("mod-imagekit");
  const { image, load, error } = useImageFile();
  const [colors, setColors] = useState<string[]>([]);
  const [format, setFormat] = useState<PaletteFormat>("css");

  useEffect(() => {
    if (!image) {
      setColors([]);
      return;
    }
    const canvas = document.createElement("canvas");
    canvas.width = image.bitmap.width;
    canvas.height = image.bitmap.height;
    const context = canvas.getContext("2d", { willReadFrequently: true });
    if (!context) return;
    context.drawImage(image.bitmap, 0, 0);
    const data = context.getImageData(0, 0, canvas.width, canvas.height).data;
    setColors(dominantColors(data, 8).map((c) => rgbToHex(c.r, c.g, c.b)));
  }, [image]);

  const output = colors.length > 0 ? formatPalette(colors, format) : "";

  return (
    <div className="flex flex-col gap-5">
      <ImageDropZone image={image} onFile={(file) => void load(file)} error={error} />

      {colors.length > 0 ? (
        <>
          <ul className="flex flex-wrap gap-2">
            {colors.map((color) => (
              <li
                key={color}
                className="flex items-center gap-2 rounded-lg border border-border-subtle bg-surface px-2.5 py-1.5 text-sm"
              >
                <span aria-hidden="true" className="size-5 rounded-md border border-border-subtle" style={{ backgroundColor: color }} />
                <code dir="ltr" className="font-mono text-xs">{color}</code>
              </li>
            ))}
          </ul>

          <div className="flex max-w-xs flex-col gap-1.5">
            <Select value={format} onValueChange={(next) => setFormat(next as PaletteFormat)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {FORMATS.map((value) => (
                  <SelectItem key={value} value={value}>
                    {t(`ui.paletteFormat.${value}` as Parameters<typeof t>[0])}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Textarea dir="ltr" readOnly className="min-h-32 font-mono text-sm" value={output} />
          <div>
            <Button
              type="button"
              onClick={() => {
                void navigator.clipboard.writeText(output);
                toast(t("ui.copied", { value: t("ui.paletteTitle") }));
              }}
            >
              {t("ui.copy")}
            </Button>
          </div>
          <p className="text-sm text-text-muted">{t("ui.privacy")}</p>
        </>
      ) : null}
    </div>
  );
}
