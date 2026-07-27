/**
 * Local file intelligence — everything Omnio learns about a dropped file
 * happens on this device. `inspectFile` sniffs the real type (browsers often
 * report none), gathers friendly facts (dimensions, pages, entries, duration),
 * and `smartActions` turns the tool registry's `accepts` declarations into an
 * ordered action list with recommendation nudges. No hardcoded tool mapping —
 * modules describe what they take; this file only matches and ranks.
 */

import { insightsFor, type FileFacts as Understanding } from "@omnio/workspace";
import { SEARCH_ENTRIES, type SearchEntry } from "@/generated/registry.search";

export type FileKind =
  | "image"
  | "pdf"
  | "zip"
  | "audio"
  | "video"
  | "json"
  | "csv"
  | "yaml"
  | "markdown"
  | "text"
  | "other";

export interface FileFacts {
  /** Image dimensions. */
  width?: number;
  height?: number;
  /** PDF page count. */
  pageCount?: number;
  /** Zip entry names (capped). */
  entries?: string[];
  /** Audio duration in seconds. */
  duration?: number;
  /** JPEG EXIF present (privacy signal). */
  hasExif?: boolean;
  /** The image has any meaningfully transparent pixels. */
  hasAlpha?: boolean;
  /** First lines of a text-like file. */
  textPreview?: string;
  /** JSON parsed successfully. */
  jsonValid?: boolean;
  /** Total uncompressed size declared by an archive — read without inflating it. */
  expandsToBytes?: number;
}

export interface FileIntel {
  file: File;
  kind: FileKind;
  /** Normalized mime — sniffed from the extension when the browser gave none. */
  mime: string;
  extension: string;
  size: number;
  facts: FileFacts;
  /**
   * The same shape the workspace stores, so every screen reasons about this
   * file through one engine rather than its own copy of the rules.
   */
  understanding?: Understanding;
  /** Object URL for previews (image/audio); caller revokes. */
  previewUrl?: string;
}

/**
 * Translate a fresh inspection into what the workspace already understands.
 *
 * The flat bag above is what the drop panel displays; this is what Omnio
 * *knows*. Keeping the second one in the workspace's own vocabulary is what
 * lets the drop panel, the Inspector, Discoveries and search all reach the
 * same conclusions about the same file.
 */
export function toUnderstanding(
  kind: FileKind,
  facts: FileFacts,
  pdfHasText?: boolean,
): Understanding | undefined {
  if (kind === "image" && facts.width && facts.height) {
    return {
      kind: "image",
      width: facts.width,
      height: facts.height,
      hasExif: facts.hasExif,
      hasAlpha: facts.hasAlpha,
    };
  }
  if (kind === "pdf" && facts.pageCount !== undefined) {
    return { kind: "pdf", pages: facts.pageCount, hasText: pdfHasText };
  }
  if ((kind === "audio" || kind === "video") && facts.duration !== undefined) {
    return { kind, durationMs: Math.round(facts.duration * 1000) };
  }
  if (facts.jsonValid !== undefined) {
    return { kind: "text", lines: 0, valid: facts.jsonValid };
  }
  return undefined;
}

const EXT_MIME: Record<string, string> = {
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  gif: "image/gif",
  webp: "image/webp",
  svg: "image/svg+xml",
  avif: "image/avif",
  bmp: "image/bmp",
  tif: "image/tiff",
  tiff: "image/tiff",
  pdf: "application/pdf",
  zip: "application/zip",
  mp3: "audio/mpeg",
  wav: "audio/wav",
  ogg: "audio/ogg",
  m4a: "audio/mp4",
  flac: "audio/flac",
  mp4: "video/mp4",
  webm: "video/webm",
  mov: "video/quicktime",
  json: "application/json",
  csv: "text/csv",
  yaml: "application/yaml",
  yml: "application/yaml",
  md: "text/markdown",
  markdown: "text/markdown",
  txt: "text/plain",
  log: "text/plain",
};

export function fileExtension(name: string): string {
  const dot = name.lastIndexOf(".");
  return dot > 0 ? name.slice(dot + 1).toLowerCase() : "";
}

/** Best-effort mime: browser's word first, extension table as fallback. */
export function normalizeMime(reportedMime: string, name: string): string {
  const reported = reportedMime.trim().toLowerCase();
  if (reported !== "" && reported !== "application/octet-stream") return reported;
  return EXT_MIME[fileExtension(name)] ?? reported;
}

export function classifyKind(mime: string, extension: string): FileKind {
  if (mime.startsWith("image/")) return "image";
  if (mime === "application/pdf") return "pdf";
  if (mime === "application/zip" || mime === "application/x-zip-compressed") return "zip";
  if (mime.startsWith("audio/")) return "audio";
  if (mime.startsWith("video/")) return "video";
  if (mime === "application/json" || mime === "text/json" || extension === "json") return "json";
  if (mime === "text/csv" || mime === "application/csv" || extension === "csv") return "csv";
  if (mime.includes("yaml") || extension === "yaml" || extension === "yml") return "yaml";
  if (mime === "text/markdown" || extension === "md") return "markdown";
  if (mime.startsWith("text/")) return "text";
  return "other";
}

/** Does a declared mime pattern (family wildcard, universal, or exact) cover this mime? */
export function mimeMatches(pattern: string, mime: string): boolean {
  if (pattern === "*/*") return true;
  if (pattern.endsWith("/*")) return mime.startsWith(pattern.slice(0, -1));
  return pattern === mime;
}

export interface SmartAction {
  entry: SearchEntry;
  /** Final ordering score. */
  score: number;
  /** i18n key under dropzone.reasons.* when this action is specially recommended. */
  reasonKey?: string;
}

/**
 * Ordered actions for a file — registry-driven. Base score is the declared
 * priority (default 50); recommendation nudges lift specific tools and attach
 * a human reason.
 */
export function smartActions(
  intel: {
    kind: FileKind;
    mime: string;
    size: number;
    facts: FileFacts;
    name?: string;
    understanding?: Understanding;
  },
  entries: readonly SearchEntry[] = SEARCH_ENTRIES,
): SmartAction[] {
  // One engine, shared with the Inspector, Discoveries and Home. This file used
  // to keep a private table of thresholds that disagreed with them: a 3 MB
  // 4000x3000 photo was "large, compress it" here and unremarkable there.
  const insights = insightsFor({
    name: intel.name ?? "",
    mime: intel.mime,
    size: intel.size,
    facts: intel.understanding,
  });
  const nudges = insights.flatMap((insight) =>
    insight.suggests
      // The insight's own weight is how strongly Omnio wants to say it, so it is
      // also how far the suggested tool rises. Halving keeps a privacy or scan
      // finding comfortably ahead of even the highest base priority, while a
      // mild observation only nudges.
      ? [{ toolId: insight.suggests, boost: Math.round(insight.weight / 2), reasonKey: insight.kind }]
      : [],
  );
  const actions: SmartAction[] = [];
  for (const entry of entries) {
    if (entry.tier !== "browser") continue;
    const matched = entry.accepts.find((accept) =>
      accept.mime.some((pattern) => mimeMatches(pattern, intel.mime)),
    );
    if (!matched) continue;
    if (matched.maxSizeMB !== undefined && intel.size > matched.maxSizeMB * 1024 * 1024) continue;
    let score = matched.priority ?? 50;
    // A tool that only makes sense on several files cannot do anything with the
    // one just dropped. Leading with "Merge PDFs" for a single document is a
    // worse first impression than not offering it at all.
    if (matched.multiple === true) score -= 100;
    let reasonKey: string | undefined;
    for (const nudge of nudges) {
      if (nudge.toolId === entry.toolId) {
        score += nudge.boost;
        reasonKey = nudge.reasonKey;
      }
    }
    actions.push({ entry, score, reasonKey });
  }
  actions.sort((a, b) => b.score - a.score);

  /**
   * Drop anything a better-placed tool already does.
   *
   * A dropped PDF offered *Organize Pages* alongside *Rotate*, *Delete* and
   * *Reorder Pages* — three jobs Organize performs — so most of the first
   * screen anyone sees was one capability under four names, which is a list to
   * puzzle over rather than a choice to make.
   *
   * Only here, on the shortlist Omnio proposes for a file it was just handed.
   * Asking for a specific tool by name, or picking one from the Inspector,
   * still reaches every one of them: this hides nothing, it only declines to
   * recommend the same thing twice.
   */
  const offered = new Set<string>();
  return actions.filter((action) => {
    const covered = action.entry.coveredBy.some((toolId) => offered.has(toolId));
    if (!covered) offered.add(action.entry.toolId);
    return !covered;
  });
}

/** Full local inspection. Heavy helpers load lazily so the shell stays light. */
export async function inspectFile(file: File): Promise<FileIntel> {
  const mime = normalizeMime(file.type, file.name);
  const extension = fileExtension(file.name);
  const kind = classifyKind(mime, extension);
  const facts: FileFacts = {};
  let previewUrl: string | undefined;

  try {
    if (kind === "image") {
      previewUrl = URL.createObjectURL(file);
      try {
        const bitmap = await createImageBitmap(file);
        facts.width = bitmap.width;
        facts.height = bitmap.height;
        // Sampled alpha scan — cheap and plenty accurate for a yes/no signal.
        if (mime === "image/png" || mime === "image/webp" || mime === "image/gif") {
          const canvas = document.createElement("canvas");
          canvas.width = bitmap.width;
          canvas.height = bitmap.height;
          const context = canvas.getContext("2d", { willReadFrequently: true });
          if (context) {
            context.drawImage(bitmap, 0, 0);
            const { data } = context.getImageData(0, 0, canvas.width, canvas.height);
            let hasAlpha = false;
            for (let i = 3; i < data.length; i += 4 * 37) {
              if (data[i]! < 250) {
                hasAlpha = true;
                break;
              }
            }
            facts.hasAlpha = hasAlpha;
          }
        }
        bitmap.close();
      } catch {
        // e.g. SVG in some browsers — preview still works via <img>.
      }
      if (mime === "image/jpeg" || mime === "image/tiff") {
        const { parseExif } = await import("@omnio/mod-imagekit/shared/exif");
        facts.hasExif = parseExif(await file.arrayBuffer()) !== null;
      }
    } else if (kind === "pdf") {
      const { PDFDocument } = await import("pdf-lib");
      const doc = await PDFDocument.load(await file.arrayBuffer(), { ignoreEncryption: true });
      facts.pageCount = doc.getPageCount();
    } else if (kind === "zip") {
      const { unzip } = await import("fflate");
      const data = new Uint8Array(await file.arrayBuffer());
      /*
       * Read the names without inflating a single byte.
       *
       * This used to decompress the entire archive into memory purely to list
       * up to eight filenames — on drop, before the person had chosen anything.
       * A small archive that expands to tens of gigabytes would take the tab
       * down, and dragging a file in is the least trusted path in the product.
       *
       * fflate's filter runs per entry with its metadata and decides whether to
       * extract; returning false means nothing is ever inflated. The names are
       * collected into an array rather than read back off an object, so archive
       * contents never become object keys either.
       */
      const names: string[] = [];
      let expandsTo = 0;
      await new Promise<void>((resolve, reject) =>
        unzip(
          data,
          {
            filter: (entry) => {
              expandsTo += entry.originalSize;
              if (!entry.name.endsWith("/") && names.length < 8) names.push(entry.name);
              return false;
            },
          },
          (error) => (error ? reject(error) : resolve()),
        ),
      );
      facts.entries = names;
      facts.expandsToBytes = expandsTo;
    } else if (kind === "audio") {
      previewUrl = URL.createObjectURL(file);
      facts.duration = await new Promise<number | undefined>((resolve) => {
        const element = document.createElement("audio");
        element.preload = "metadata";
        element.onloadedmetadata = () => resolve(element.duration);
        element.onerror = () => resolve(undefined);
        element.src = previewUrl!;
      });
    } else if (["json", "csv", "yaml", "markdown", "text"].includes(kind) && file.size < 5 * 1024 * 1024) {
      const text = await file.text();
      facts.textPreview = text.split("\n").slice(0, 8).join("\n").slice(0, 600);
      if (kind === "json") {
        try {
          JSON.parse(text);
          facts.jsonValid = true;
        } catch {
          facts.jsonValid = false;
        }
      }
    }
  } catch {
    // Inspection is best-effort — a fact we couldn't gather is simply absent.
  }

  return {
    file,
    kind,
    mime,
    extension,
    size: file.size,
    facts,
    understanding: toUnderstanding(kind, facts),
    previewUrl,
  };
}
