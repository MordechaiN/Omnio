"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Dialog, DialogContent, DialogHeader, DialogTitle, EmptyState, Spinner } from "@omnio/ui";
import { FileQuestion } from "lucide-react";
import { detectKind, formatBytes, type FileKind } from "@/lib/file-kind";

/**
 * Universal file viewer foundation — renders a file entirely on the device
 * (nothing is uploaded). Images, PDF, text/code, audio, and video are shown
 * inline; anything else gets a graceful "no preview" state.
 */
export function FileViewer({ file, onClose }: { file: File | null; onClose: () => void }) {
  const t = useTranslations("files");
  const tCommon = useTranslations("common");
  const [url, setUrl] = useState<string | null>(null);
  const [text, setText] = useState<string | null>(null);

  const kind: FileKind | null = file ? detectKind(file) : null;

  useEffect(() => {
    setUrl(null);
    setText(null);
    if (!file || !kind) return;

    if (kind === "text") {
      let cancelled = false;
      void file.text().then((content) => {
        if (!cancelled) setText(content);
      });
      return () => {
        cancelled = true;
      };
    }

    const objectUrl = URL.createObjectURL(file);
    setUrl(objectUrl);
    return () => URL.revokeObjectURL(objectUrl);
  }, [file, kind]);

  return (
    <Dialog open={file !== null} onOpenChange={(open) => !open && onClose()}>
      <DialogContent size="lg" closeLabel={tCommon("close")} className="max-w-4xl">
        {file && kind ? (
          <>
            <DialogHeader>
              <DialogTitle className="truncate">{file.name}</DialogTitle>
              <p className="text-sm text-text-muted">
                {file.type || tCommon("comingSoon")} · {formatBytes(file.size)}
              </p>
            </DialogHeader>
            <div className="max-h-[70vh] overflow-auto rounded-lg border border-border-subtle bg-surface">
              <Preview kind={kind} url={url} text={text} file={file} loadingLabel={t("loading")} />
            </div>
          </>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}

function Preview({
  kind,
  url,
  text,
  file,
  loadingLabel,
}: {
  kind: FileKind;
  url: string | null;
  text: string | null;
  file: File;
  loadingLabel: string;
}) {
  const t = useTranslations("files");

  if (kind === "text") {
    if (text === null) return <Loading label={loadingLabel} />;
    return (
      <pre className="max-w-full whitespace-pre-wrap break-words p-4 font-mono text-sm text-text">
        {text}
      </pre>
    );
  }

  if (!url) return <Loading label={loadingLabel} />;

  switch (kind) {
    case "image":
      // A user file's object URL, not a remote asset — plain <img> is correct here.
      return <img src={url} alt={file.name} className="mx-auto max-h-[70vh] object-contain" />;
    case "pdf":
      return <iframe src={url} title={file.name} className="h-[70vh] w-full" />;
    case "audio":
      return <audio src={url} controls className="w-full p-6" />;
    case "video":
      return <video src={url} controls className="max-h-[70vh] w-full" />;
    default:
      return (
        <div className="p-6">
          <EmptyState
            icon={FileQuestion}
            title={t("noPreviewTitle")}
            description={t("noPreviewBody")}
          />
        </div>
      );
  }
}

function Loading({ label }: { label: string }) {
  return (
    <div className="flex items-center justify-center gap-2 p-12 text-sm text-text-muted">
      <Spinner size={16} />
      {label}
    </div>
  );
}
