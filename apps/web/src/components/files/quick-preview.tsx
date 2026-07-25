"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { workspace } from "@omnio/workspace";
import { useThumbnail } from "@omnio/workspace/react";
import type { WorkspaceFile } from "@omnio/workspace";
import { Button, Dialog, DialogContent, DialogHeader, DialogTitle } from "@omnio/ui";

/**
 * Quick Look: Space opens a large preview without leaving the grid, Space or
 * Escape closes it. Deliberately not a route — the point is that it is
 * dismissible in one keystroke and never loses the selection behind it.
 */
export function QuickPreview({
  fileId,
  file,
  onClose,
  onOpen,
}: {
  fileId: string;
  file: WorkspaceFile | null;
  onClose: () => void;
  onOpen: () => void;
}) {
  const t = useTranslations("files");
  const [url, setUrl] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [text, setText] = useState<string | null>(null);
  const rendered = useThumbnail(file);

  useEffect(() => {
    let cancelled = false;
    let objectUrl: string | null = null;
    void (async () => {
      const source = await workspace.peekFile(fileId);
      if (!source || cancelled) return;
      setName(source.name);
      if (source.type.startsWith("text/") || source.type === "application/json") {
        setText((await source.text()).slice(0, 5000));
        return;
      }
      // Only types a browser reliably renders inline get an object URL. A PDF
      // in an <object> shows an empty white panel in many browsers, which is
      // worse than showing the page image we already generated.
      if (source.type.startsWith("image/") || source.type.startsWith("video/") || source.type.startsWith("audio/")) {
        objectUrl = URL.createObjectURL(source);
        if (!cancelled) setUrl(objectUrl);
      }
    })();
    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [fileId]);

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle className="truncate">{name}</DialogTitle>
        </DialogHeader>
        <div className="flex max-h-[60vh] min-h-64 items-center justify-center overflow-auto rounded bg-surface-subtle p-4">
          {text !== null ? (
            <pre className="w-full whitespace-pre-wrap p-3 text-start text-xs">{text}</pre>
          ) : url ? (
            <object data={url} className="h-[60vh] w-full" aria-label={name}>
              <p className="p-4 text-sm text-text-muted">{t("noPreview")}</p>
            </object>
          ) : rendered ? (
            <img
              src={rendered}
              alt={name}
              className="max-h-[60vh] max-w-full rounded border border-border-subtle object-contain shadow-2"
            />
          ) : (
            <p className="text-sm text-text-muted">{t("noPreview")}</p>
          )}
        </div>
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={onClose}>
            {t("close")}
          </Button>
          <Button onClick={onOpen}>{t("open")}</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
