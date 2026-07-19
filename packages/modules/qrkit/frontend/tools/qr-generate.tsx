"use client";

import { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import QRCode from "qrcode";
import { Button, Label, Select, SelectContent, SelectItem, SelectTrigger, SelectValue, Textarea } from "@omnio/ui";

const SIZES = [256, 512, 1024] as const;

/** QR generator — text or link in, crisp PNG out, rendered on your device. */
export default function QrGenerateTool() {
  const t = useTranslations("mod-qrkit");
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [text, setText] = useState("https://omnio.example");
  const [size, setSize] = useState<number>(512);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    if (text.trim() === "") return;
    QRCode.toCanvas(canvas, text, { width: Math.min(size, 512), margin: 2 }, (error) =>
      setFailed(Boolean(error)),
    );
  }, [text, size]);

  async function download() {
    if (text.trim() === "") return;
    try {
      const url = await QRCode.toDataURL(text, { width: size, margin: 2 });
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = `qr-${size}.png`;
      anchor.click();
    } catch {
      setFailed(true);
    }
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="qr-text">{t("ui.textLabel")}</Label>
        <Textarea
          id="qr-text"
          dir="ltr"
          className="min-h-20 font-mono text-sm"
          value={text}
          spellCheck={false}
          onChange={(event) => setText(event.target.value)}
        />
      </div>

      {failed ? (
        <p role="alert" className="text-sm text-danger">
          {t("ui.tooLong")}
        </p>
      ) : null}

      {text.trim() !== "" && !failed ? (
        <div className="flex flex-col items-start gap-4 sm:flex-row sm:items-end">
          <div className="rounded-xl border border-border-subtle bg-white p-3">
            <canvas ref={canvasRef} role="img" aria-label={t("ui.previewAlt")} className="size-44" />
          </div>
          <div className="flex flex-col gap-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="qr-size">{t("ui.sizeLabel")}</Label>
              <Select value={String(size)} onValueChange={(next) => setSize(Number(next))}>
                <SelectTrigger id="qr-size" className="w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {SIZES.map((value) => (
                    <SelectItem key={value} value={String(value)}>
                      {value}×{value}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button type="button" onClick={() => void download()}>
              {t("ui.download")}
            </Button>
          </div>
        </div>
      ) : null}
      <p className="text-sm text-text-muted">{t("ui.privacy")}</p>
    </div>
  );
}
