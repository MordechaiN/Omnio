"use client";

import { useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { Button, Input } from "@omnio/ui";
import type { SignatureSource, VisualSignature } from "../../shared/signatures.ts";

/**
 * Capture a visual signature — drawn, typed, or uploaded — as a transparent PNG.
 *
 * This produces a picture, not a cryptographic signature. The caller is
 * responsible for saying so in the UI; see shared/signatures.ts.
 */

const PAD_WIDTH = 600;
const PAD_HEIGHT = 200;
/** Script-ish stack, degrading to whatever cursive the OS has. */
const TYPED_FONT = '"Segoe Script", "Brush Script MT", "Snell Roundhand", cursive';

/** Trim fully-transparent margins so the mark sits tight in its placement box. */
function trimTransparent(canvas: HTMLCanvasElement): HTMLCanvasElement {
  const ctx = canvas.getContext("2d");
  if (!ctx) return canvas;
  const { width, height } = canvas;
  const data = ctx.getImageData(0, 0, width, height).data;
  let minX = width;
  let minY = height;
  let maxX = -1;
  let maxY = -1;
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      if (data[(y * width + x) * 4 + 3]! > 8) {
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      }
    }
  }
  if (maxX < minX || maxY < minY) return canvas; // nothing drawn
  const pad = 4;
  minX = Math.max(0, minX - pad);
  minY = Math.max(0, minY - pad);
  maxX = Math.min(width - 1, maxX + pad);
  maxY = Math.min(height - 1, maxY + pad);
  const out = document.createElement("canvas");
  out.width = maxX - minX + 1;
  out.height = maxY - minY + 1;
  out.getContext("2d")?.drawImage(canvas, minX, minY, out.width, out.height, 0, 0, out.width, out.height);
  return out;
}

function toSignature(canvas: HTMLCanvasElement, source: SignatureSource): VisualSignature {
  const trimmed = trimTransparent(canvas);
  return {
    mode: "visual",
    source,
    png: trimmed.toDataURL("image/png"),
    naturalWidth: trimmed.width,
    naturalHeight: trimmed.height,
  };
}

export function SignaturePad({
  onCapture,
  onCancel,
}: {
  onCapture: (signature: VisualSignature) => void;
  onCancel: () => void;
}) {
  const t = useTranslations("mod-pdfkit");
  const [tab, setTab] = useState<SignatureSource>("draw");
  const [typed, setTyped] = useState("");
  const [hasInk, setHasInk] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const drawing = useRef(false);

  function ctxOf(): CanvasRenderingContext2D | null {
    const ctx = canvasRef.current?.getContext("2d") ?? null;
    if (ctx) {
      ctx.lineWidth = 2.5;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      ctx.strokeStyle = "#111827";
    }
    return ctx;
  }

  function pointerPos(e: React.PointerEvent<HTMLCanvasElement>) {
    const rect = e.currentTarget.getBoundingClientRect();
    return {
      x: ((e.clientX - rect.left) / rect.width) * PAD_WIDTH,
      y: ((e.clientY - rect.top) / rect.height) * PAD_HEIGHT,
    };
  }

  function startStroke(e: React.PointerEvent<HTMLCanvasElement>) {
    e.currentTarget.setPointerCapture(e.pointerId);
    drawing.current = true;
    const ctx = ctxOf();
    const p = pointerPos(e);
    ctx?.beginPath();
    ctx?.moveTo(p.x, p.y);
  }

  function extendStroke(e: React.PointerEvent<HTMLCanvasElement>) {
    if (!drawing.current) return;
    const ctx = ctxOf();
    const p = pointerPos(e);
    ctx?.lineTo(p.x, p.y);
    ctx?.stroke();
    setHasInk(true);
  }

  function clearPad() {
    const canvas = canvasRef.current;
    if (canvas) canvas.getContext("2d")?.clearRect(0, 0, canvas.width, canvas.height);
    setHasInk(false);
  }

  function captureDrawn() {
    if (canvasRef.current && hasInk) onCapture(toSignature(canvasRef.current, "draw"));
  }

  function captureTyped() {
    const text = typed.trim();
    if (!text) return;
    const canvas = document.createElement("canvas");
    canvas.width = PAD_WIDTH;
    canvas.height = PAD_HEIGHT;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.fillStyle = "#111827";
    ctx.textBaseline = "middle";
    // Shrink to fit rather than clipping a long name.
    let size = 96;
    do {
      ctx.font = `${size}px ${TYPED_FONT}`;
      size -= 4;
    } while (size > 16 && ctx.measureText(text).width > PAD_WIDTH - 40);
    ctx.fillText(text, 20, PAD_HEIGHT / 2);
    onCapture(toSignature(canvas, "type"));
  }

  async function captureUpload(file: File) {
    const url = URL.createObjectURL(file);
    try {
      const img = new Image();
      await new Promise((resolve, reject) => {
        img.onload = resolve;
        img.onerror = () => reject(new Error("image"));
        img.src = url;
      });
      const canvas = document.createElement("canvas");
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      canvas.getContext("2d")?.drawImage(img, 0, 0);
      onCapture(toSignature(canvas, "image"));
    } finally {
      URL.revokeObjectURL(url);
    }
  }

  const tabs: SignatureSource[] = ["draw", "type", "image"];

  return (
    <div className="flex flex-col gap-3 rounded-lg border border-border bg-surface p-4" role="group" aria-label={t("ui.sigTitle")}>
      <div className="flex flex-wrap items-center gap-2" role="tablist" aria-label={t("ui.sigTitle")}>
        {tabs.map((s) => (
          <Button
            key={s}
            type="button"
            size="sm"
            role="tab"
            aria-selected={tab === s}
            variant={tab === s ? "primary" : "secondary"}
            onClick={() => setTab(s)}
          >
            {t(`ui.sigTab_${s}` as Parameters<typeof t>[0])}
          </Button>
        ))}
      </div>

      {tab === "draw" ? (
        <div className="flex flex-col gap-2">
          <canvas
            ref={canvasRef}
            width={PAD_WIDTH}
            height={PAD_HEIGHT}
            onPointerDown={startStroke}
            onPointerMove={extendStroke}
            onPointerUp={() => (drawing.current = false)}
            aria-label={t("ui.sigDrawLabel")}
            className="w-full touch-none rounded border border-dashed border-border bg-white"
            style={{ aspectRatio: `${PAD_WIDTH} / ${PAD_HEIGHT}`, cursor: "crosshair" }}
          />
          <div className="flex gap-2">
            <Button type="button" size="sm" variant="ghost" onClick={clearPad} disabled={!hasInk}>
              {t("ui.sigClear")}
            </Button>
            <Button type="button" size="sm" onClick={captureDrawn} disabled={!hasInk}>
              {t("ui.sigUse")}
            </Button>
          </div>
        </div>
      ) : null}

      {tab === "type" ? (
        <div className="flex flex-col gap-2">
          <Input
            value={typed}
            onChange={(e) => setTyped(e.target.value)}
            placeholder={t("ui.sigTypePlaceholder")}
            aria-label={t("ui.sigTypePlaceholder")}
          />
          <div
            aria-hidden
            className="min-h-16 rounded border border-dashed border-border bg-white px-4 py-2 text-4xl text-neutral-900"
            style={{ fontFamily: TYPED_FONT }}
          >
            {typed}
          </div>
          <Button type="button" size="sm" onClick={captureTyped} disabled={typed.trim() === ""}>
            {t("ui.sigUse")}
          </Button>
        </div>
      ) : null}

      {tab === "image" ? (
        <div className="flex flex-col gap-2">
          <Input
            type="file"
            accept="image/png,image/jpeg,image/webp"
            aria-label={t("ui.sigUploadLabel")}
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) void captureUpload(f);
            }}
          />
          <p className="text-sm text-text-muted">{t("ui.sigUploadHint")}</p>
        </div>
      ) : null}

      <p className="text-sm text-text-muted">{t("ui.sigDisclaimer")}</p>
      <div>
        <Button type="button" size="sm" variant="ghost" onClick={onCancel}>
          {t("ui.sigCancel")}
        </Button>
      </div>
    </div>
  );
}
