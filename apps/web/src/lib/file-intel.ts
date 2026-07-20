/**
 * Local file intelligence — everything Omnio learns about a dropped file
 * happens on this device. `inspectFile` sniffs the real type (browsers often
 * report none), gathers friendly facts (dimensions, pages, entries, duration),
 * and `smartActions` turns the tool registry's `accepts` declarations into an
 * ordered action list with recommendation nudges. No hardcoded tool mapping —
 * modules describe what they take; this file only matches and ranks.
 */

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
}

export interface FileIntel {
  file: File;
  kind: FileKind;
  /** Normalized mime — sniffed from the extension when the browser gave none. */
  mime: string;
  extension: string;
  size: number;
  facts: FileFacts;
  /** Object URL for previews (image/audio); caller revokes. */
  previewUrl?: string;
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

interface Nudge {
  toolId: string;
  boost: number;
  reasonKey: string;
}

/**
 * Recommendation rules — small, legible nudges layered on the declared
 * priorities. Each returns the tool it wants to lift and why.
 */
export function recommendationNudges(intel: {
  kind: FileKind;
  mime: string;
  size: number;
  facts: FileFacts;
}): Nudge[] {
  const nudges: Nudge[] = [];
  const { kind, mime, size, facts } = intel;
  const MB = 1024 * 1024;

  if (kind === "image") {
    if (size > 2 * MB) {
      nudges.push({ toolId: "image-compress", boost: 20, reasonKey: "largeImage" });
    }
    if ((facts.width ?? 0) > 3000 || (facts.height ?? 0) > 3000) {
      nudges.push({ toolId: "image-resize", boost: 16, reasonKey: "hugeDimensions" });
    }
    if (facts.hasExif) {
      nudges.push({ toolId: "exif-remove", boost: 24, reasonKey: "exifPresent" });
    }
    if (mime === "image/png" && size > 1 * MB && !facts.hasAlpha) {
      nudges.push({ toolId: "image-compress", boost: 6, reasonKey: "pngToWebp" });
    }
    if (facts.hasAlpha && size > 300 * 1024) {
      nudges.push({ toolId: "image-compress", boost: 8, reasonKey: "transparentPng" });
    }
  }
  if (kind === "pdf" && size > 15 * MB) {
    nudges.push({ toolId: "pdf-split-size", boost: 22, reasonKey: "oversizedPdf" });
  }
  if (kind === "json" && facts.jsonValid === false) {
    nudges.push({ toolId: "json-format", boost: 20, reasonKey: "invalidJson" });
  }
  if (kind === "audio" && (facts.duration ?? 0) > 600) {
    nudges.push({ toolId: "audio-trim", boost: 10, reasonKey: "longAudio" });
  }
  if (kind === "zip" && size > 50 * MB) {
    nudges.push({ toolId: "zip-extract", boost: 6, reasonKey: "hugeZip" });
  }
  return nudges;
}

/**
 * Ordered actions for a file — registry-driven. Base score is the declared
 * priority (default 50); recommendation nudges lift specific tools and attach
 * a human reason.
 */
export function smartActions(
  intel: { kind: FileKind; mime: string; size: number; facts: FileFacts },
  entries: readonly SearchEntry[] = SEARCH_ENTRIES,
): SmartAction[] {
  const nudges = recommendationNudges(intel);
  const actions: SmartAction[] = [];
  for (const entry of entries) {
    if (entry.tier !== "browser") continue;
    const matched = entry.accepts.find((accept) =>
      accept.mime.some((pattern) => mimeMatches(pattern, intel.mime)),
    );
    if (!matched) continue;
    if (matched.maxSizeMB !== undefined && intel.size > matched.maxSizeMB * 1024 * 1024) continue;
    let score = matched.priority ?? 50;
    let reasonKey: string | undefined;
    for (const nudge of nudges) {
      if (nudge.toolId === entry.toolId) {
        score += nudge.boost;
        reasonKey = nudge.reasonKey;
      }
    }
    actions.push({ entry, score, reasonKey });
  }
  return actions.sort((a, b) => b.score - a.score);
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
      const unzipped = await new Promise<Record<string, Uint8Array>>((resolve, reject) =>
        unzip(data, (error, result) => (error ? reject(error) : resolve(result))),
      );
      facts.entries = Object.keys(unzipped)
        .filter((name) => !name.endsWith("/"))
        .slice(0, 8);
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

  return { file, kind, mime, extension, size: file.size, facts, previewUrl };
}
