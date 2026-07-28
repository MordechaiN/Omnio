"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { Badge, Button } from "@omnio/ui";
import { pdfFilename } from "../../shared/pages.ts";
import {
  deleteSelected,
  duplicateSelected,
  initialSlots,
  insertBlankAt,
  isUnchanged,
  movePages,
  rangeIds,
  rotateSelected,
  type PageSlot,
} from "../../shared/organize.ts";
import { applySlots } from "../lib/pdf-organize.ts";
import { loadPdfjsDocument, renderPageToCanvas } from "../lib/pdfjs.ts";
import { downloadPdf, loadPdf, PdfDropZone, usePendingPdf, type LoadedPdf } from "../lib/pdf-file.tsx";

/** Thumbnails are small; 0.35 keeps a 100-page document responsive. */
const THUMB_SCALE = 0.35;

/**
 * Visual page organizer — a thumbnail grid with multi-select, drag reordering,
 * per-page rotation, duplication, deletion and blank insertion, applied in one
 * pass at the end.
 */
/** Identity of an arrangement: order, sources and rotations — nothing else. */
const signatureOf = (slots: PageSlot[]): string =>
  slots.map((slot) => `${slot.source}:${slot.rotation}`).join("|");

export default function PdfOrganizeTool() {
  const t = useTranslations("mod-pdfkit");
  const [file, setFile] = useState<LoadedPdf | null>(null);
  const [raw, setRaw] = useState<Uint8Array | null>(null);
  const [slots, setSlots] = useState<PageSlot[]>([]);
  const [history, setHistory] = useState<PageSlot[][]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [anchor, setAnchor] = useState<string | null>(null);
  const [thumbs, setThumbs] = useState<Map<number, string>>(new Map());
  const [dragOver, setDragOver] = useState<number | null>(null);
  const [failed, setFailed] = useState<"load" | "save" | null>(null);
  /**
   * The arrangement as it was when the file was last saved.
   *
   * "You have unsaved changes" used to be derived purely from "the pages
   * differ from the original", so it stayed on screen after saving — you
   * pressed Save, the file downloaded, and Omnio still told you your work
   * was unsaved. Whether that reads as "the save failed" or "Omnio has lost
   * track", it is the wrong thing to be told at the one moment you are
   * deciding whether you can move on.
   */
  const [savedSlots, setSavedSlots] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const dragging = useRef(false);

  /** Every mutation goes through here so undo is never forgotten. */
  const commit = useCallback((next: (current: PageSlot[]) => PageSlot[]) => {
    setSlots((current) => {
      const updated = next(current);
      if (updated === current) return current;
      setHistory((h) => [...h.slice(-49), current]);
      return updated;
    });
  }, []);

  const undo = useCallback(() => {
    setHistory((h) => {
      if (h.length === 0) return h;
      setSlots(h[h.length - 1]!);
      return h.slice(0, -1);
    });
  }, []);

  async function open(files: File[]) {
    setFailed(null);
    setThumbs(new Map());
    setHistory([]);
    setSelected(new Set());
    try {
      const source = files[0]!;
      const bytes = new Uint8Array(await source.arrayBuffer());
      const loaded = await loadPdf(source);
      setFile(loaded);
      setRaw(bytes);
      setSlots(initialSlots(loaded.pageCount));
      setSavedSlots(null);
      void renderThumbs(bytes, loaded.pageCount);
    } catch {
      setFailed("load");
    }
  }
  usePendingPdf((files) => void open(files));

  /** Render thumbnails progressively so the grid is usable before the last page. */
  async function renderThumbs(bytes: Uint8Array, pageCount: number) {
    const doc = await loadPdfjsDocument(bytes.slice().buffer);
    for (let i = 0; i < pageCount; i += 1) {
      const canvas = await renderPageToCanvas(doc, i + 1, THUMB_SCALE);
      const url = canvas.toDataURL("image/png");
      setThumbs((m) => new Map(m).set(i, url));
    }
  }

  function selectAt(slot: PageSlot, e: React.MouseEvent | React.KeyboardEvent) {
    const additive = e.ctrlKey || e.metaKey;
    const ranged = e.shiftKey && anchor;
    if (ranged) {
      setSelected(new Set(rangeIds(slots, anchor, slot.id)));
      return;
    }
    if (additive) {
      setSelected((s) => {
        const next = new Set(s);
        if (next.has(slot.id)) next.delete(slot.id);
        else next.add(slot.id);
        return next;
      });
      setAnchor(slot.id);
      return;
    }
    setSelected(new Set([slot.id]));
    setAnchor(slot.id);
  }

  const selectAll = useCallback(() => setSelected(new Set(slots.map((s) => s.id))), [slots]);

  function onDrop(targetIndex: number) {
    dragging.current = false;
    setDragOver(null);
    if (selected.size > 0) commit((s) => movePages(s, selected, targetIndex));
  }

  async function save() {
    if (!raw || !file) return;
    setBusy(true);
    setFailed(null);
    try {
      downloadPdf(await applySlots(raw, slots), pdfFilename(file.name, "organized"));
      setSavedSlots(signatureOf(slots));
    } catch {
      setFailed("save");
    } finally {
      setBusy(false);
    }
  }

  // Document-level shortcuts: an organizer is a keyboard tool for anyone with
  // more than a handful of pages.
  useEffect(() => {
    if (!file) return undefined;
    function onKey(e: KeyboardEvent) {
      const target = e.target as HTMLElement | null;
      if (target && /^(INPUT|TEXTAREA)$/.test(target.tagName)) return;
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "a") {
        e.preventDefault();
        selectAll();
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "z") {
        e.preventDefault();
        undo();
      } else if (e.key === "Delete" || e.key === "Backspace") {
        e.preventDefault();
        commit((s) => deleteSelected(s, selected));
        setSelected(new Set());
      } else if (e.key === "Escape") {
        setSelected(new Set());
      }
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [file, selected, selectAll, undo, commit]);

  const hasSelection = selected.size > 0;
  const changed = file
    ? !isUnchanged(slots, file.pageCount) && signatureOf(slots) !== savedSlots
    : false;

  return (
    <div className="flex flex-col gap-5">
      <PdfDropZone onFiles={(f) => void open(f)} hasFile={file !== null} />
      {failed === "load" ? <p role="alert" className="text-sm text-danger">{t("ui.errorLoad")}</p> : null}
      {file ? (
        <>
          <div className="flex flex-wrap items-center gap-2" role="toolbar" aria-label={t("ui.orgToolbar")}>
            <Badge variant="neutral">{t("ui.orgPageCount", { count: slots.length })}</Badge>
            {hasSelection ? <Badge variant="neutral">{t("ui.orgSelected", { count: selected.size })}</Badge> : null}
            <Button type="button" size="sm" variant="secondary" onClick={() => commit((s) => rotateSelected(s, selected, -90))} disabled={!hasSelection}>
              {t("ui.orgRotateLeft")}
            </Button>
            <Button type="button" size="sm" variant="secondary" onClick={() => commit((s) => rotateSelected(s, selected, 90))} disabled={!hasSelection}>
              {t("ui.orgRotateRight")}
            </Button>
            <Button type="button" size="sm" variant="secondary" onClick={() => commit((s) => duplicateSelected(s, selected))} disabled={!hasSelection}>
              {t("ui.orgDuplicate")}
            </Button>
            <Button
              type="button"
              size="sm"
              variant="secondary"
              onClick={() => {
                commit((s) => deleteSelected(s, selected));
                setSelected(new Set());
              }}
              disabled={!hasSelection || selected.size >= slots.length}
            >
              {t("ui.orgDelete")}
            </Button>
            <Button type="button" size="sm" variant="secondary" onClick={() => commit((s) => insertBlankAt(s, s.length))}>
              {t("ui.orgInsertBlank")}
            </Button>
            <Button type="button" size="sm" variant="ghost" onClick={selectAll} disabled={slots.length === 0}>
              {t("ui.orgSelectAll")}
            </Button>
            <Button type="button" size="sm" variant="ghost" onClick={undo} disabled={history.length === 0}>
              {t("ui.orgUndo")}
            </Button>
          </div>

          <ul className="flex flex-wrap gap-3" aria-label={t("ui.orgGrid")}>
            {slots.map((slot, index) => {
              const isSelected = selected.has(slot.id);
              const thumb = slot.source === null ? null : thumbs.get(slot.source);
              return (
                <li
                  key={slot.id}
                  draggable
                  onDragStart={() => {
                    dragging.current = true;
                    // Dragging an unselected page acts on that page alone.
                    if (!selected.has(slot.id)) setSelected(new Set([slot.id]));
                  }}
                  onDragOver={(e) => {
                    e.preventDefault();
                    setDragOver(index);
                  }}
                  onDrop={() => onDrop(index)}
                  onDragEnd={() => {
                    dragging.current = false;
                    setDragOver(null);
                  }}
                  className="list-none"
                >
                  <button
                    type="button"
                    onClick={(e) => selectAt(slot, e)}
                    aria-pressed={isSelected}
                    aria-label={
                      slot.source === null
                        ? t("ui.orgBlankPage", { position: index + 1 })
                        : t("ui.orgPageLabel", { source: slot.source + 1, position: index + 1 })
                    }
                    className={`relative flex h-40 w-32 items-center justify-center overflow-hidden rounded-md border-2 bg-surface transition ${
                      isSelected ? "border-accent ring-2 ring-accent/40" : "border-border-subtle"
                    } ${dragOver === index ? "border-dashed border-accent" : ""}`}
                  >
                    {slot.source === null ? (
                      <span className="text-xs text-text-muted">{t("ui.orgBlank")}</span>
                    ) : thumb ? (
                      <img
                        src={thumb}
                        alt=""
                        className="max-h-full max-w-full object-contain transition-transform"
                        style={{ transform: `rotate(${slot.rotation}deg)` }}
                      />
                    ) : (
                      <span className="text-xs text-text-muted">…</span>
                    )}
                    <span className="absolute bottom-1 end-1 rounded bg-surface/90 px-1 text-xs">{index + 1}</span>
                  </button>
                </li>
              );
            })}
          </ul>

          <div className="flex flex-wrap items-center gap-3">
            <Button type="button" onClick={() => void save()} disabled={busy || slots.length === 0}>
              {busy ? t("ui.working") : t("ui.orgApply")}
            </Button>
            {changed ? <span className="text-sm text-text-muted">{t("ui.orgChanged")}</span> : null}
          </div>
          {failed === "save" ? <p role="alert" className="text-sm text-danger">{t("ui.editError")}</p> : null}
          <p className="text-sm text-text-muted">{t("ui.orgHint")}</p>
          <p className="text-sm text-text-muted">{t("ui.privacy")}</p>
        </>
      ) : null}
    </div>
  );
}
