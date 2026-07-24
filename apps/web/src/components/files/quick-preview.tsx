"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { workspace } from "@omnio/workspace";
import { Button, Dialog, DialogContent, DialogHeader, DialogTitle } from "@omnio/ui";

/**
 * Quick Look: Space opens a large preview without leaving the grid, Space or
 * Escape closes it. Deliberately not a route — the point is that it is
 * dismissible in one keystroke and never loses the selection behind it.
 */
export function QuickPreview({
  fileId,
  onClose,
  onOpen,
}: {
  fileId: string;
  onClose: () => void;
  onOpen: () => void;
}) {
  const t = useTranslations("files");
  const [url, setUrl] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [text, setText] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    let objectUrl: string | null = null;
    void (async () => {
      const file = await workspace.peekFile(fileId);
      if (!file || cancelled) return;
      setName(file.name);
      if (file.type.startsWith("text/") || file.type === "application/json") {
        setText((await file.text()).slice(0, 5000));
        return;
      }
      objectUrl = URL.createObjectURL(file);
      if (!cancelled) setUrl(objectUrl);
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
        <div className="flex max-h-[60vh] min-h-64 items-center justify-center overflow-auto rounded bg-surface-subtle">
          {text !== null ? (
            <pre className="w-full whitespace-pre-wrap p-3 text-start text-xs">{text}</pre>
          ) : url ? (
            <object data={url} className="h-[60vh] w-full" aria-label={name}>
              <p className="p-4 text-sm text-text-muted">{t("noPreview")}</p>
            </object>
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
