"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Badge, Button, Input } from "@omnio/ui";
import { pdfFilename } from "../../shared/pages.ts";
import {
  buildOutlineTree,
  flattenOutline,
  indentAt,
  moveSubtree,
  outdentAt,
  subtreeEnd,
  validBookmarks,
  type FlatBookmark,
} from "../../shared/outline.ts";
import { readOutlineTree, writeOutline } from "../lib/mupdf.ts";
import { downloadPdf, loadPdf, PdfDropZone, usePendingPdf, type LoadedPdf } from "../lib/pdf-file.tsx";

let idCounter = 0;
const nextId = () => `n${(idCounter += 1)}`;

/** Bookmark / table-of-contents editor — read, restructure, and write a PDF outline. */
export default function PdfBookmarksTool() {
  const t = useTranslations("mod-pdfkit");
  const [file, setFile] = useState<LoadedPdf | null>(null);
  const [raw, setRaw] = useState<Uint8Array | null>(null);
  const [items, setItems] = useState<FlatBookmark[]>([]);
  const [failed, setFailed] = useState<"load" | "save" | null>(null);
  const [busy, setBusy] = useState(false);

  async function open(files: File[]) {
    setFailed(null);
    try {
      const source = files[0]!;
      const bytes = new Uint8Array(await source.arrayBuffer());
      const loaded = await loadPdf(source);
      setFile(loaded);
      setRaw(bytes);
      setItems(flattenOutline(await readOutlineTree(bytes)));
    } catch {
      setFailed("load");
    }
  }
  usePendingPdf((files) => void open(files));

  function patch(index: number, change: Partial<FlatBookmark>) {
    setItems((list) => list.map((b, i) => (i === index ? { ...b, ...change } : b)));
  }

  function addBookmark() {
    setItems((list) => [...list, { id: nextId(), title: "", page: 0, depth: 0 }]);
  }

  function removeAt(index: number) {
    // Remove the entry together with everything nested under it.
    setItems((list) => [...list.slice(0, index), ...list.slice(subtreeEnd(list, index))]);
  }

  async function save() {
    if (!raw || !file) return;
    setBusy(true);
    setFailed(null);
    try {
      const tree = buildOutlineTree(validBookmarks(items, file.pageCount));
      const out = await writeOutline(raw, tree);
      downloadPdf(out, pdfFilename(file.name, "bookmarks"));
    } catch {
      setFailed("save");
    } finally {
      setBusy(false);
    }
  }

  const writable = file ? validBookmarks(items, file.pageCount).length : 0;
  const dropped = items.length - writable;

  return (
    <div className="flex flex-col gap-5">
      <PdfDropZone onFiles={(f) => void open(f)} hasFile={file !== null} />
      {failed === "load" ? <p role="alert" className="text-sm text-danger">{t("ui.errorLoad")}</p> : null}
      {file ? (
        <>
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="neutral">{t("ui.bmCount", { count: items.length })}</Badge>
            <Button type="button" size="sm" variant="secondary" onClick={addBookmark}>
              {t("ui.bmAdd")}
            </Button>
          </div>

          {items.length === 0 ? (
            <p className="text-sm text-text-muted">{t("ui.bmEmpty")}</p>
          ) : (
            <ul className="flex flex-col gap-2">
              {items.map((b, i) => (
                <li key={b.id} className="flex flex-wrap items-center gap-2" style={{ marginInlineStart: b.depth * 24 }}>
                  <Input
                    value={b.title}
                    onChange={(e) => patch(i, { title: e.target.value })}
                    placeholder={t("ui.bmTitlePlaceholder")}
                    aria-label={t("ui.bmTitlePlaceholder")}
                    className="min-w-40 flex-1"
                  />
                  <Input
                    type="number"
                    min={1}
                    max={file.pageCount}
                    value={b.page + 1}
                    onChange={(e) => patch(i, { page: Number(e.target.value) - 1 })}
                    aria-label={t("ui.bmPage")}
                    className="w-20"
                  />
                  <Button type="button" size="sm" variant="ghost" onClick={() => setItems((l) => outdentAt(l, i))} disabled={b.depth === 0} aria-label={t("ui.bmOutdent")}>
                    ←
                  </Button>
                  <Button type="button" size="sm" variant="ghost" onClick={() => setItems((l) => indentAt(l, i))} disabled={i === 0} aria-label={t("ui.bmIndent")}>
                    →
                  </Button>
                  <Button type="button" size="sm" variant="ghost" onClick={() => setItems((l) => moveSubtree(l, i, Math.max(0, i - 1)))} disabled={i === 0} aria-label={t("ui.moveUp")}>
                    ↑
                  </Button>
                  <Button type="button" size="sm" variant="ghost" onClick={() => setItems((l) => moveSubtree(l, i, subtreeEnd(l, i) + 1))} disabled={subtreeEnd(items, i) >= items.length} aria-label={t("ui.moveDown")}>
                    ↓
                  </Button>
                  <Button type="button" size="sm" variant="ghost" onClick={() => removeAt(i)} aria-label={t("ui.remove")}>
                    ✕
                  </Button>
                </li>
              ))}
            </ul>
          )}

          {dropped > 0 ? <p className="text-sm text-text-muted">{t("ui.bmDropped", { count: dropped })}</p> : null}

          <div>
            <Button type="button" onClick={() => void save()} disabled={busy}>
              {busy ? t("ui.working") : t("ui.bmSave")}
            </Button>
          </div>
          {failed === "save" ? <p role="alert" className="text-sm text-danger">{t("ui.editError")}</p> : null}
          <p className="text-sm text-text-muted">{t("ui.privacy")}</p>
        </>
      ) : null}
    </div>
  );
}
