"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Badge, Button, Input, Label } from "@omnio/ui";
import { pdfFilename } from "../../shared/pages.ts";
import { runQpdf } from "../lib/qpdf.ts";
import { downloadPdf, loadPdf, PdfDropZone, usePendingPdf, type LoadedPdf } from "../lib/pdf-file.tsx";

/** Protect PDF — add a password (256-bit AES), on your device. */
export default function PdfProtectTool() {
  const t = useTranslations("mod-pdfkit");
  const [file, setFile] = useState<LoadedPdf | null>(null);
  const [raw, setRaw] = useState<Uint8Array | null>(null);
  const [password, setPassword] = useState("");
  const [failed, setFailed] = useState<"load" | "encrypt" | null>(null);
  const [busy, setBusy] = useState(false);

  async function open(files: File[]) {
    setFailed(null);
    try {
      const bytes = new Uint8Array(await files[0]!.arrayBuffer());
      setRaw(bytes);
      setFile(await loadPdf(new File([bytes], files[0]!.name, { type: "application/pdf" })));
    } catch {
      setFailed("load");
    }
  }
  usePendingPdf((files) => void open(files));

  async function run() {
    if (!file || !raw || password === "") return;
    setBusy(true);
    setFailed(null);
    try {
      const out = await runQpdf(raw, (inPath, outPath) => [
        "--encrypt", password, password, "256", "--", inPath, outPath,
      ]);
      downloadPdf(out, pdfFilename(file.name, "protected"));
    } catch {
      setFailed("encrypt");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col gap-5">
      <PdfDropZone onFiles={(f) => void open(f)} hasFile={file !== null} />
      {failed === "load" ? <p role="alert" className="text-sm text-danger">{t("ui.errorLoad")}</p> : null}
      {file ? (
        <>
          <div className="flex flex-wrap items-center gap-2 text-sm">
            <span dir="ltr" className="max-w-60 truncate font-medium">{file.name}</span>
            <Badge variant="neutral">{t("ui.pageCount", { count: file.pageCount })}</Badge>
          </div>
          <div className="flex max-w-sm flex-col gap-1.5">
            <Label htmlFor="protect-pw">{t("ui.protectPassword")}</Label>
            <Input id="protect-pw" dir="ltr" type="text" className="font-mono" value={password}
              spellCheck={false} autoComplete="off" onChange={(e) => setPassword(e.target.value)} />
            <p className="text-sm text-text-muted">{t("ui.protectHint")}</p>
          </div>
          {failed === "encrypt" ? <p role="alert" className="text-sm text-danger">{t("ui.protectError")}</p> : null}
          <div>
            <Button type="button" onClick={() => void run()} disabled={busy || password === ""}>
              {busy ? t("ui.protectWorking") : t("ui.protectAction")}
            </Button>
          </div>
          <p className="text-sm text-text-muted">{t("ui.privacy")}</p>
        </>
      ) : null}
    </div>
  );
}
