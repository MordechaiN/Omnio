"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { Badge, Button, Textarea } from "@omnio/ui";
import { pdfFilename } from "../../shared/pages.ts";
import { normalizeRect, screenToPdf, type Annotation, type AnnotationKind, type Point } from "../../shared/annotations.ts";
import { bakeAnnotations } from "../lib/pdf-editor.ts";
import { loadPdfjsDocument, renderPageToCanvas } from "../lib/pdfjs.ts";
import { downloadPdf, loadPdf, PdfDropZone, usePendingPdf, type LoadedPdf } from "../lib/pdf-file.tsx";

type Mode = AnnotationKind;
const RECT_KINDS: Mode[] = ["highlight", "underline", "rect", "ellipse", "note", "redact"];
const MODES: Mode[] = ["highlight", "underline", "rect", "ellipse", "line", "ink", "note", "redact"];

interface PageInfo {
  widthPt: number;
  heightPt: number;
}

let annoCounter = 0;
const nextId = () => `a${(annoCounter += 1)}`;

/** Unified PDF editor — highlight, underline, shapes, freehand, notes, and true redaction. */
export default function PdfEditTool() {
  const t = useTranslations("mod-pdfkit");
  const [file, setFile] = useState<LoadedPdf | null>(null);
  const [raw, setRaw] = useState<Uint8Array | null>(null);
  const [failed, setFailed] = useState<"load" | "save" | null>(null);
  const [busy, setBusy] = useState(false);

  const docRef = useRef<Awaited<ReturnType<typeof loadPdfjsDocument>> | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);

  const [pageIndex, setPageIndex] = useState(0);
  const [pageInfo, setPageInfo] = useState<PageInfo | null>(null);
  const [scale, setScale] = useState(1);

  const [mode, setMode] = useState<Mode>("highlight");
  const [color, setColor] = useState("#ffd400");
  const [annotations, setAnnotations] = useState<Annotation[]>([]);
  const [draft, setDraft] = useState<{ start: Point; current: Point; path: Point[] } | null>(null);
  const [editingNote, setEditingNote] = useState<string | null>(null);

  const reset = () => {
    setAnnotations([]);
    setDraft(null);
    setEditingNote(null);
    setPageIndex(0);
  };

  async function open(files: File[]) {
    setFailed(null);
    reset();
    try {
      const bytes = new Uint8Array(await files[0]!.arrayBuffer());
      setRaw(bytes);
      setFile(await loadPdf(new File([bytes], files[0]!.name, { type: "application/pdf" })));
      docRef.current = await loadPdfjsDocument(bytes.slice().buffer);
    } catch {
      setFailed("load");
    }
  }
  usePendingPdf((files) => void open(files));

  // Render the current page to the canvas, sized to the container width.
  const renderPage = useCallback(async () => {
    const doc = docRef.current;
    const wrap = wrapRef.current;
    const canvas = canvasRef.current;
    if (!doc || !wrap || !canvas) return;
    const page = await doc.getPage(pageIndex + 1);
    const base = page.getViewport({ scale: 1 });
    const displayWidth = Math.min(wrap.clientWidth, 900);
    const s = displayWidth / base.width;
    const rendered = await renderPageToCanvas(doc, pageIndex + 1, s);
    canvas.width = rendered.width;
    canvas.height = rendered.height;
    const ctx = canvas.getContext("2d");
    if (ctx) ctx.drawImage(rendered, 0, 0);
    setPageInfo({ widthPt: base.width, heightPt: base.height });
    setScale(s);
  }, [pageIndex]);

  useEffect(() => {
    if (file) void renderPage();
  }, [file, pageIndex, renderPage]);

  const toScreen = useCallback(
    (pt: Point) => ({ x: pt.x * scale, y: (pageInfo!.heightPt - pt.y) * scale }),
    [scale, pageInfo],
  );

  function localPoint(e: React.PointerEvent): { x: number; y: number } {
    const rect = (e.currentTarget as SVGElement).getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  }

  function onPointerDown(e: React.PointerEvent) {
    if (!pageInfo || editingNote) return;
    (e.currentTarget as SVGElement).setPointerCapture(e.pointerId);
    const p = localPoint(e);
    const pdf = screenToPdf(p.x, p.y, pageInfo.heightPt, scale);
    setDraft({ start: pdf, current: pdf, path: [pdf] });
  }

  function onPointerMove(e: React.PointerEvent) {
    if (!draft || !pageInfo) return;
    const p = localPoint(e);
    const pdf = screenToPdf(p.x, p.y, pageInfo.heightPt, scale);
    setDraft((d) => (d ? { ...d, current: pdf, path: mode === "ink" ? [...d.path, pdf] : d.path } : d));
  }

  function commitDraft() {
    if (!draft) return;
    const base: Annotation = { id: nextId(), kind: mode, page: pageIndex, color };
    let anno: Annotation | null = null;
    if (RECT_KINDS.includes(mode)) {
      const r = normalizeRect(draft.start, draft.current);
      if (r.x1 - r.x0 > 1 && r.y1 - r.y0 > 1) anno = { ...base, rect: r, text: mode === "note" ? "" : undefined };
    } else if (mode === "line") {
      anno = { ...base, path: [draft.start, draft.current] };
    } else if (mode === "ink") {
      if (draft.path.length >= 2) anno = { ...base, path: draft.path };
    }
    setDraft(null);
    if (anno) {
      setAnnotations((a) => [...a, anno!]);
      if (anno.kind === "note") setEditingNote(anno.id);
    }
  }

  const undo = () => setAnnotations((a) => a.slice(0, -1));

  async function save() {
    if (!raw || !file) return;
    setBusy(true);
    setFailed(null);
    try {
      const out = await bakeAnnotations(raw, annotations);
      downloadPdf(out, pdfFilename(file.name, "edited"));
    } catch {
      setFailed("save");
    } finally {
      setBusy(false);
    }
  }

  const pageAnnotations = useMemo(() => annotations.filter((a) => a.page === pageIndex), [annotations, pageIndex]);

  return (
    <div className="flex flex-col gap-5">
      <PdfDropZone onFiles={(f) => void open(f)} hasFile={file !== null} />
      {failed === "load" ? <p role="alert" className="text-sm text-danger">{t("ui.errorLoad")}</p> : null}
      {file && pageInfo ? (
        <>
          <div className="flex flex-wrap items-center gap-2" role="toolbar" aria-label={t("ui.editToolbar")}>
            {MODES.map((m) => (
              <Button
                key={m}
                type="button"
                size="sm"
                variant={mode === m ? "primary" : "secondary"}
                aria-pressed={mode === m}
                onClick={() => setMode(m)}
              >
                {t(`ui.editMode_${m}` as Parameters<typeof t>[0])}
              </Button>
            ))}
            <label className="flex items-center gap-1 text-sm">
              <span>{t("ui.editColor")}</span>
              <input
                type="color"
                value={color}
                onChange={(e) => setColor(e.target.value)}
                aria-label={t("ui.editColor")}
                className="h-8 w-10 cursor-pointer rounded border border-border"
              />
            </label>
            <Button type="button" size="sm" variant="ghost" onClick={undo} disabled={annotations.length === 0}>
              {t("ui.editUndo")}
            </Button>
          </div>

          <div ref={wrapRef} className="relative mx-auto max-w-full overflow-auto rounded-lg border border-border-subtle">
            <div className="relative" style={{ width: pageInfo.widthPt * scale, height: pageInfo.heightPt * scale }}>
              <canvas ref={canvasRef} className="block" />
              <svg
                className="absolute inset-0 touch-none"
                width={pageInfo.widthPt * scale}
                height={pageInfo.heightPt * scale}
                onPointerDown={onPointerDown}
                onPointerMove={onPointerMove}
                onPointerUp={commitDraft}
                role="application"
                aria-label={t("ui.editCanvas")}
                style={{ cursor: "crosshair" }}
              >
                {pageAnnotations.map((a) => (
                  <AnnotationShape key={a.id} a={a} toScreen={toScreen} />
                ))}
                {draft ? <DraftShape mode={mode} draft={draft} color={color} toScreen={toScreen} /> : null}
              </svg>
              {editingNote ? (
                <NoteEditor
                  annotation={annotations.find((a) => a.id === editingNote)!}
                  toScreen={toScreen}
                  onChange={(text) => setAnnotations((a) => a.map((x) => (x.id === editingNote ? { ...x, text } : x)))}
                  onDone={() => setEditingNote(null)}
                  placeholder={t("ui.editNotePlaceholder")}
                />
              ) : null}
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-sm">
              <Button type="button" size="sm" variant="secondary" onClick={() => setPageIndex((p) => Math.max(0, p - 1))} disabled={pageIndex === 0}>
                {t("ui.editPrev")}
              </Button>
              <span>{t("ui.editPageOf", { page: pageIndex + 1, total: file.pageCount })}</span>
              <Button type="button" size="sm" variant="secondary" onClick={() => setPageIndex((p) => Math.min(file.pageCount - 1, p + 1))} disabled={pageIndex >= file.pageCount - 1}>
                {t("ui.editNext")}
              </Button>
              <Badge variant="neutral">{t("ui.editCount", { count: annotations.length })}</Badge>
            </div>
            <Button type="button" onClick={() => void save()} disabled={busy || annotations.length === 0}>
              {busy ? t("ui.editSaving") : t("ui.editDownload")}
            </Button>
          </div>
          {failed === "save" ? <p role="alert" className="text-sm text-danger">{t("ui.editError")}</p> : null}
          <p className="text-sm text-text-muted">{t("ui.editRedactNote")}</p>
          <p className="text-sm text-text-muted">{t("ui.privacy")}</p>
        </>
      ) : null}
    </div>
  );
}

function AnnotationShape({ a, toScreen }: { a: Annotation; toScreen: (p: Point) => { x: number; y: number } }) {
  if (a.rect) {
    const tl = toScreen({ x: a.rect.x0, y: a.rect.y1 });
    const w = (a.rect.x1 - a.rect.x0) * 0 + (toScreen({ x: a.rect.x1, y: a.rect.y1 }).x - tl.x);
    const h = toScreen({ x: a.rect.x0, y: a.rect.y0 }).y - tl.y;
    if (a.kind === "highlight") return <rect x={tl.x} y={tl.y} width={w} height={h} fill={a.color} opacity={0.35} />;
    if (a.kind === "note") return <rect x={tl.x} y={tl.y} width={w} height={h} fill={a.color} opacity={0.2} stroke={a.color} />;
    if (a.kind === "redact") return <rect x={tl.x} y={tl.y} width={w} height={h} fill="#000" />;
    if (a.kind === "underline") return <line x1={tl.x} y1={tl.y + h} x2={tl.x + w} y2={tl.y + h} stroke={a.color} strokeWidth={2} />;
    if (a.kind === "ellipse") return <ellipse cx={tl.x + w / 2} cy={tl.y + h / 2} rx={Math.abs(w / 2)} ry={Math.abs(h / 2)} fill="none" stroke={a.color} strokeWidth={2} />;
    return <rect x={tl.x} y={tl.y} width={w} height={h} fill="none" stroke={a.color} strokeWidth={2} />;
  }
  if (a.path && a.path.length >= 2) {
    const pts = a.path.map((p) => toScreen(p));
    return <polyline points={pts.map((p) => `${p.x},${p.y}`).join(" ")} fill="none" stroke={a.color} strokeWidth={2} />;
  }
  return null;
}

function DraftShape({
  mode,
  draft,
  color,
  toScreen,
}: {
  mode: Mode;
  draft: { start: Point; current: Point; path: Point[] };
  color: string;
  toScreen: (p: Point) => { x: number; y: number };
}) {
  if (mode === "ink") {
    const pts = draft.path.map((p) => toScreen(p));
    return <polyline points={pts.map((p) => `${p.x},${p.y}`).join(" ")} fill="none" stroke={color} strokeWidth={2} />;
  }
  if (mode === "line") {
    const s = toScreen(draft.start);
    const e = toScreen(draft.current);
    return <line x1={s.x} y1={s.y} x2={e.x} y2={e.y} stroke={color} strokeWidth={2} />;
  }
  const r = normalizeRect(draft.start, draft.current);
  const tl = toScreen({ x: r.x0, y: r.y1 });
  const w = toScreen({ x: r.x1, y: r.y1 }).x - tl.x;
  const h = toScreen({ x: r.x0, y: r.y0 }).y - tl.y;
  const fill = mode === "redact" ? "#000" : color;
  const opacity = mode === "redact" ? 1 : 0.3;
  return <rect x={tl.x} y={tl.y} width={w} height={h} fill={fill} opacity={opacity} stroke={color} />;
}

function NoteEditor({
  annotation,
  toScreen,
  onChange,
  onDone,
  placeholder,
}: {
  annotation: Annotation;
  toScreen: (p: Point) => { x: number; y: number };
  onChange: (text: string) => void;
  onDone: () => void;
  placeholder: string;
}) {
  if (!annotation.rect) return null;
  const tl = toScreen({ x: annotation.rect.x0, y: annotation.rect.y1 });
  return (
    <div className="absolute z-10" style={{ left: tl.x, top: tl.y, width: 180 }}>
      <Textarea
        autoFocus
        value={annotation.text ?? ""}
        onChange={(e) => onChange(e.target.value)}
        onBlur={onDone}
        placeholder={placeholder}
        aria-label={placeholder}
        className="min-h-16 text-sm"
      />
    </div>
  );
}
