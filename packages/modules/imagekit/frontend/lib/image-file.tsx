"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { takePendingFiles } from "@omnio/module-sdk";
import { Badge } from "@omnio/ui";
import { formatBytes } from "../../shared/resize.ts";

export interface LoadedImage {
  name: string;
  size: number;
  type: string;
  bitmap: ImageBitmap;
  /** The original File — kept so chains can compare results against it. */
  file: File;
  /** Object URL for previews. */
  previewUrl: string;
}

/**
 * Load state + revocation handling shared by every imagekit surface.
 * `autoClaim: false` opts out of the pending-file hand-off — surfaces with
 * several slots (compare) claim and distribute the files themselves.
 */
export function useImageFile(autoClaim = true) {
  const [image, setImage] = useState<LoadedImage | null>(null);
  const [error, setError] = useState<boolean>(false);

  useEffect(
    () => () => {
      if (image) URL.revokeObjectURL(image.previewUrl);
    },
    [image],
  );

  const load = useCallback(async (file: File) => {
    setError(false);
    try {
      const bitmap = await createImageBitmap(file);
      setImage((previous) => {
        if (previous) URL.revokeObjectURL(previous.previewUrl);
        return {
          name: file.name,
          size: file.size,
          type: file.type,
          bitmap,
          file,
          previewUrl: URL.createObjectURL(file),
        };
      });
    } catch {
      setError(true);
    }
  }, []);

  // Universal drop zone hand-off: if the shell navigated here with a file,
  // open it immediately — the user already chose what to do with it.
  useEffect(() => {
    if (!autoClaim) return;
    const handed = takePendingFiles()?.[0];
    if (handed) void load(handed);
  }, [autoClaim, load]);

  return { image, load, error };
}

/** Trigger a browser download for a canvas-produced blob. */
export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

/**
 * The shared drop zone: click, keyboard, or drag an image in. Compact once a
 * file is loaded so the tool body keeps the space.
 */
export function ImageDropZone({
  image,
  onFile,
  error,
}: {
  image: LoadedImage | null;
  onFile: (file: File) => void;
  error: boolean;
}) {
  const t = useTranslations("mod-imagekit");
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);

  return (
    <div className="flex flex-col gap-3">
      {/* A <label> wrapping the real input is natively clickable and
          keyboard-operable (Enter/Space via the input itself) — no role,
          tabIndex, or key handler needed, and no interactive-in-interactive
          nesting for axe to flag. Drag handlers stay on the label since
          drag-and-drop has no native form-control equivalent. */}
      <label
        onDragOver={(event) => {
          event.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(event) => {
          event.preventDefault();
          setDragOver(false);
          const file = event.dataTransfer.files[0];
          if (file) onFile(file);
        }}
        className={`flex cursor-pointer flex-col items-center justify-center gap-1.5 rounded-xl border-2 border-dashed text-center transition-colors duration-(--motion-fast) ${
          image ? "px-4 py-3" : "p-8"
        } ${dragOver ? "border-accent bg-accent-subtle" : "border-border hover:border-border-strong"}`}
      >
        <p className="text-sm font-medium">{image ? t("ui.dropReplace") : t("ui.dropTitle")}</p>
        {!image ? <p className="text-sm text-text-muted">{t("ui.dropHint")}</p> : null}
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          aria-label={t("ui.dropLabel")}
          className="sr-only"
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (file) onFile(file);
            event.target.value = "";
          }}
        />
      </label>

      {error ? (
        <p role="alert" className="text-sm text-danger">
          {t("ui.errorUnsupported")}
        </p>
      ) : null}

      {image ? (
        <div className="flex flex-wrap items-center gap-2 text-sm">
          <span dir="ltr" className="max-w-60 truncate font-medium">
            {image.name}
          </span>
          <Badge variant="neutral">
            <span dir="ltr">
              {image.bitmap.width}×{image.bitmap.height}
            </span>
          </Badge>
          <Badge variant="neutral">{formatBytes(image.size)}</Badge>
        </div>
      ) : null}
    </div>
  );
}
