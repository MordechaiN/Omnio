"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Alert, AlertDescription, Badge } from "@omnio/ui";
import { formatBytes } from "../../shared/resize.ts";
import { parseExif, type ExifSummary } from "../../shared/exif.ts";
import { ImageDropZone, useImageFile } from "../lib/image-file.tsx";

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="contents">
      <dt className="text-sm text-text-muted">{label}</dt>
      <dd dir="ltr" className="text-start text-sm break-all">
        {value}
      </dd>
    </div>
  );
}

/**
 * Metadata viewer — the basics for any image, plus the EXIF summary for JPEGs
 * (camera, capture time, orientation, and whether location data is embedded).
 */
export default function ImageMetadataTool() {
  const t = useTranslations("mod-imagekit");
  const { image, load, error } = useImageFile();
  const [exif, setExif] = useState<ExifSummary | null>(null);
  const [rawFile, setRawFile] = useState<File | null>(null);

  useEffect(() => {
    let cancelled = false;
    if (!rawFile) {
      setExif(null);
      return;
    }
    void rawFile.arrayBuffer().then((buffer) => {
      if (!cancelled) setExif(parseExif(buffer));
    });
    return () => {
      cancelled = true;
    };
  }, [rawFile]);

  return (
    <div className="flex flex-col gap-5">
      <ImageDropZone
        image={image}
        onFile={(file) => {
          setRawFile(file);
          void load(file);
        }}
        error={error}
      />

      {image ? (
        <>
          <section className="flex flex-col gap-3 rounded-lg border border-border-subtle bg-surface p-4">
            <h2 className="text-sm font-semibold text-text-secondary">{t("ui.metaFile")}</h2>
            <dl className="grid gap-x-6 gap-y-1.5 sm:grid-cols-[auto_1fr]">
              <Row label={t("ui.metaName")} value={image.name} />
              <Row label={t("ui.metaType")} value={image.type || "—"} />
              <Row label={t("ui.metaSize")} value={formatBytes(image.size)} />
              <Row
                label={t("ui.metaDimensions")}
                value={`${image.bitmap.width}×${image.bitmap.height}`}
              />
            </dl>
          </section>

          {exif ? (
            <section className="flex flex-col gap-3 rounded-lg border border-border-subtle bg-surface p-4">
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-semibold text-text-secondary">{t("ui.metaExif")}</h2>
                {exif.hasGps ? (
                  <Badge variant="accent">{t("ui.metaHasGps")}</Badge>
                ) : (
                  <Badge variant="neutral">{t("ui.metaNoGps")}</Badge>
                )}
              </div>
              <dl className="grid gap-x-6 gap-y-1.5 sm:grid-cols-[auto_1fr]">
                {exif.make ? <Row label={t("ui.metaMake")} value={exif.make} /> : null}
                {exif.model ? <Row label={t("ui.metaModel")} value={exif.model} /> : null}
                {exif.dateTime ? <Row label={t("ui.metaDate")} value={exif.dateTime} /> : null}
                {exif.software ? <Row label={t("ui.metaSoftware")} value={exif.software} /> : null}
                {exif.orientation !== undefined ? (
                  <Row label={t("ui.metaOrientation")} value={String(exif.orientation)} />
                ) : null}
              </dl>
              {exif.hasGps ? (
                <Alert>
                  <AlertDescription>{t("ui.metaGpsWarning")}</AlertDescription>
                </Alert>
              ) : null}
            </section>
          ) : (
            <p className="text-sm text-text-muted">{t("ui.metaNoExif")}</p>
          )}
          <p className="text-sm text-text-muted">{t("ui.privacy")}</p>
        </>
      ) : null}
    </div>
  );
}
