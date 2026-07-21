"use client";

import { useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { Button, Input, Label } from "@omnio/ui";
import { runQpdf } from "../lib/qpdf.ts";
import { downloadPdf } from "../lib/pdf-file.tsx";

/** Unlock PDF — remove a password you know (decrypts), on your device. */
export default function PdfUnlockTool() {
  const t = useTranslations("mod-pdfkit");
  const inputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<{ name: string; bytes: Uint8Array } | null>(null);
  const [password, setPassword] = useState("");
  const [dragOver, setDragOver] = useState(false);
  const [failed, setFailed] = useState<"decrypt" | null>(null);
  const [busy, setBusy] = useState(false);

  async function open(picked: File) {
    setFailed(null);
    setFile({ name: picked.name, bytes: new Uint8Array(await picked.arrayBuffer()) });
  }

  async function run() {
    if (!file) return;
    setBusy(true);
    setFailed(null);
    try {
      const out = await runQpdf(file.bytes, (inPath, outPath) => [
        `--password=${password}`, "--decrypt", inPath, outPath,
      ]);
      downloadPdf(out, file.name.replace(/\.pdf$/i, "") + "-unlocked.pdf");
    } catch {
      setFailed("decrypt");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col gap-5">
      <label
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => { e.preventDefault(); setDragOver(false); const f = e.dataTransfer.files[0]; if (f) void open(f); }}
        className={`flex cursor-pointer flex-col items-center justify-center gap-1.5 rounded-xl border-2 border-dashed text-center transition-colors duration-(--motion-fast) ${
          file ? "px-4 py-3" : "p-8"
        } ${dragOver ? "border-accent bg-accent-subtle" : "border-border hover:border-border-strong"}`}
      >
        <p className="text-sm font-medium">{file ? t("ui.dropMore") : t("ui.unlockDropTitle")}</p>
        {!file ? <p className="text-sm text-text-muted">{t("ui.unlockDropHint")}</p> : null}
        <input ref={inputRef} type="file" accept="application/pdf,.pdf" aria-label={t("ui.unlockDropTitle")} className="sr-only"
          onChange={(e) => { const f = e.target.files?.[0]; if (f) void open(f); e.target.value = ""; }} />
      </label>

      {file ? (
        <>
          <p dir="ltr" className="text-start text-sm font-medium">{file.name}</p>
          <div className="flex max-w-sm flex-col gap-1.5">
            <Label htmlFor="unlock-pw">{t("ui.unlockPassword")}</Label>
            <Input id="unlock-pw" dir="ltr" type="text" className="font-mono" value={password}
              spellCheck={false} autoComplete="off" onChange={(e) => setPassword(e.target.value)} />
          </div>
          {failed === "decrypt" ? <p role="alert" className="text-sm text-danger">{t("ui.unlockError")}</p> : null}
          <div>
            <Button type="button" onClick={() => void run()} disabled={busy}>
              {busy ? t("ui.protectWorking") : t("ui.unlockAction")}
            </Button>
          </div>
          <p className="text-sm text-text-muted">{t("ui.unlockNote")}</p>
          <p className="text-sm text-text-muted">{t("ui.privacy")}</p>
        </>
      ) : null}
    </div>
  );
}
