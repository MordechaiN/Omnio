"use client";

import { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { takePendingFiles } from "@omnio/module-sdk";
import { zip, type Zippable } from "fflate";
import { Badge, Button, IconButton, Input, Label, Progress, Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@omnio/ui";
import { X } from "lucide-react";
import { formatBytes, lockedDimensions, outputFilename, type OutputFormat } from "../../shared/resize.ts";
import { downloadBlob } from "../lib/image-file.tsx";

interface BatchItem {
  file: File;
  status: "pending" | "done" | "failed";
  output?: { blob: Blob; name: string; width: number; height: number };
}

const FORMATS: Array<{ value: OutputFormat | "keep"; label: string }> = [
  { value: "keep", label: "" }, // label from i18n at render
  { value: "image/webp", label: "WebP" },
  { value: "image/jpeg", label: "JPEG" },
  { value: "image/png", label: "PNG" },
];

/**
 * Batch pipeline: many images in, one set of rules, everything processed on
 * this device — then one ZIP out (or per-file saves). Re-encoding through a
 * canvas also strips all metadata for free.
 */
export default function ImageBatchTool() {
  const t = useTranslations("mod-imagekit");
  const inputRef = useRef<HTMLInputElement>(null);
  const [items, setItems] = useState<BatchItem[]>([]);
  const [maxDimension, setMaxDimension] = useState("2000");
  const [format, setFormat] = useState<OutputFormat | "keep">("keep");
  const [quality, setQuality] = useState(85);
  const [running, setRunning] = useState(false);
  const [progress, setProgress] = useState(0);
  const [dragOver, setDragOver] = useState(false);

  function add(list: FileList | File[] | null) {
    if (!list) return;
    const images = [...list].filter((file) => file.type.startsWith("image/"));
    setItems((previous) => [
      ...previous,
      ...images.map((file) => ({ file, status: "pending" as const })),
    ]);
  }

  useEffect(() => {
    const handed = takePendingFiles();
    if (handed) add(handed);
  }, []);

  async function processOne(item: BatchItem): Promise<BatchItem> {
    try {
      const bitmap = await createImageBitmap(item.file);
      const limit = Math.max(16, Number(maxDimension) || 100000);
      const source = { width: bitmap.width, height: bitmap.height };
      const target =
        Math.max(source.width, source.height) > limit
          ? source.width >= source.height
            ? lockedDimensions(source, "width", limit)
            : lockedDimensions(source, "height", limit)
          : source;
      const canvas = document.createElement("canvas");
      canvas.width = target.width;
      canvas.height = target.height;
      canvas.getContext("2d")?.drawImage(bitmap, 0, 0, target.width, target.height);
      bitmap.close();
      const outFormat: OutputFormat =
        format === "keep"
          ? item.file.type === "image/jpeg" || item.file.type === "image/webp"
            ? (item.file.type as OutputFormat)
            : "image/png"
          : format;
      const blob = await new Promise<Blob | null>((resolve) =>
        canvas.toBlob(resolve, outFormat, outFormat === "image/png" ? undefined : quality / 100),
      );
      if (!blob) throw new Error("encode failed");
      return {
        ...item,
        status: "done",
        output: {
          blob,
          name: outputFilename(item.file.name, target, outFormat),
          width: target.width,
          height: target.height,
        },
      };
    } catch {
      return { ...item, status: "failed" };
    }
  }

  async function run() {
    setRunning(true);
    setProgress(0);
    const next = [...items];
    for (let i = 0; i < next.length; i += 1) {
      next[i] = await processOne({ ...next[i]!, status: "pending", output: undefined });
      setItems([...next]);
      setProgress(Math.round(((i + 1) / next.length) * 100));
    }
    setRunning(false);
  }

  async function downloadZip() {
    const done = items.filter((item) => item.output);
    const payload: Zippable = {};
    for (const item of done) {
      payload[item.output!.name] = new Uint8Array(await item.output!.blob.arrayBuffer());
    }
    const bytes = await new Promise<Uint8Array>((resolve, reject) =>
      zip(payload, { level: 6 }, (error, data) => (error ? reject(error) : resolve(data))),
    );
    downloadBlob(new Blob([bytes as BlobPart], { type: "application/zip" }), "images.zip");
  }

  const doneCount = items.filter((item) => item.status === "done").length;
  const totalIn = items.reduce((sum, item) => sum + item.file.size, 0);
  const totalOut = items.reduce((sum, item) => sum + (item.output?.blob.size ?? 0), 0);

  return (
    <div className="flex flex-col gap-5">
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
          add(event.dataTransfer.files);
        }}
        className={`flex cursor-pointer flex-col items-center justify-center gap-1.5 rounded-xl border-2 border-dashed text-center transition-colors duration-(--motion-fast) ${
          items.length > 0 ? "px-4 py-3" : "p-8"
        } ${dragOver ? "border-accent bg-accent-subtle" : "border-border hover:border-border-strong"}`}
      >
        <p className="text-sm font-medium">
          {items.length > 0 ? t("ui.batchDropMore") : t("ui.batchDropTitle")}
        </p>
        {items.length === 0 ? (
          <p className="text-sm text-text-muted">{t("ui.batchDropHint")}</p>
        ) : null}
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          multiple
          className="sr-only"
          onChange={(event) => {
            add(event.target.files);
            event.target.value = "";
          }}
        />
      </div>

      {items.length > 0 ? (
        <>
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="batch-max">{t("ui.batchMaxDimension")}</Label>
              <Input
                id="batch-max"
                dir="ltr"
                type="number"
                inputMode="numeric"
                min={16}
                value={maxDimension}
                onChange={(event) => setMaxDimension(event.target.value)}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="batch-format">{t("ui.format")}</Label>
              <Select value={format} onValueChange={(next) => setFormat(next as OutputFormat | "keep")}>
                <SelectTrigger id="batch-format">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {FORMATS.map(({ value, label }) => (
                    <SelectItem key={value} value={value}>
                      {value === "keep" ? t("ui.batchKeepFormat") : label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="batch-quality">{t("ui.quality", { quality })}</Label>
              <input
                id="batch-quality"
                type="range"
                min={10}
                max={100}
                value={quality}
                onChange={(event) => setQuality(Number(event.target.value))}
                className="accent-accent"
              />
            </div>
          </div>

          <ul className="flex max-h-72 flex-col gap-1.5 overflow-y-auto pe-1">
            {items.map((item, index) => (
              <li
                key={`${item.file.name}-${index}`}
                className="flex items-center gap-3 rounded-lg border border-border-subtle bg-surface px-3 py-1.5 text-sm"
              >
                <span dir="ltr" className="min-w-0 flex-1 truncate text-start">
                  {item.file.name}
                </span>
                <Badge variant="neutral">{formatBytes(item.file.size)}</Badge>
                {item.status === "done" && item.output ? (
                  <>
                    <span aria-hidden="true" className="text-text-disabled">
                      →
                    </span>
                    <Badge variant="accent">{formatBytes(item.output.blob.size)}</Badge>
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      onClick={() => downloadBlob(item.output!.blob, item.output!.name)}
                    >
                      {t("ui.download")}
                    </Button>
                  </>
                ) : item.status === "failed" ? (
                  <Badge variant="neutral">{t("ui.batchFailed")}</Badge>
                ) : null}
                <IconButton
                  aria-label={t("ui.batchRemove")}
                  icon={X}
                  size="sm"
                  variant="ghost"
                  onClick={() => setItems((previous) => previous.filter((_, i) => i !== index))}
                />
              </li>
            ))}
          </ul>

          {running ? <Progress value={progress} aria-label={t("ui.batchRunning")} /> : null}

          <div className="flex flex-wrap items-center gap-3">
            <Button type="button" onClick={() => void run()} disabled={running || items.length === 0}>
              {running
                ? t("ui.batchRunning")
                : t("ui.batchRun", { count: items.length })}
            </Button>
            {doneCount > 0 ? (
              <>
                <Button type="button" variant="secondary" onClick={() => void downloadZip()}>
                  {t("ui.batchZip", { count: doneCount })}
                </Button>
                <Button type="button" variant="ghost" onClick={() => setItems([])}>
                  {t("ui.batchClear")}
                </Button>
                {totalOut > 0 && totalOut < totalIn ? (
                  <Badge variant="accent">
                    {t("ui.savings", {
                      percent: Math.round((1 - totalOut / totalIn) * 100),
                    })}
                  </Badge>
                ) : null}
              </>
            ) : null}
          </div>
          <p className="text-sm text-text-muted">{t("ui.batchPrivacy")}</p>
        </>
      ) : null}
    </div>
  );
}
