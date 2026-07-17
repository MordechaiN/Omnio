import { extname } from "node:path";
import { fromBuffer } from "file-type";

/** file-type recommends sniffing up to the first 4100 bytes. */
export const HEAD_BYTES = 4100;

/** Extension synonyms that describe the same magic-byte type. */
const ALIASES: Record<string, string> = {
  jpg: "jpeg",
  tif: "tiff",
  htm: "html",
  yml: "yaml",
  mpeg: "mpg",
};

/** ZIP-container formats file-type reports generically as application/zip. */
const ZIP_CONTAINERS: Record<string, string> = {
  zip: "application/zip",
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  pptx: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  odt: "application/vnd.oasis.opendocument.text",
  ods: "application/vnd.oasis.opendocument.spreadsheet",
  odp: "application/vnd.oasis.opendocument.presentation",
  epub: "application/epub+zip",
  jar: "application/java-archive",
};

/** Text-like MIME types magic-byte sniffing cannot confirm; trusted if declared. */
const SAFE_TEXT_MIME = new Set([
  "text/plain",
  "text/csv",
  "text/markdown",
  "text/html",
  "text/xml",
  "application/xml",
  "application/json",
  "application/yaml",
  "image/svg+xml",
]);

export class UploadValidationError extends Error {}

function normalizeExt(raw: string): string {
  const ext = raw.toLowerCase().replace(/^\./, "");
  return ALIASES[ext] ?? ext;
}

export interface ValidatedType {
  mime: string;
}

/**
 * Validate a file's declared identity against its bytes (docs/architecture/06-security.md §3):
 * magic-byte detection is authoritative; a declared extension that contradicts
 * it is rejected. Undetectable (text-like) uploads fall back to a safe declared
 * MIME or application/octet-stream — never a guessed binary type.
 */
export async function validateUploadHead(params: {
  filename: string;
  declaredMime?: string;
  head: Buffer;
}): Promise<ValidatedType> {
  // A tiny file can be shorter than a magic signature; treat an incomplete
  // sniff as "undetectable" rather than an error.
  const detected = await fromBuffer(params.head).catch(() => undefined);
  const declaredExt = normalizeExt(extname(params.filename));

  if (detected) {
    if (detected.mime === "application/zip" && declaredExt in ZIP_CONTAINERS) {
      return { mime: ZIP_CONTAINERS[declaredExt] ?? detected.mime };
    }
    if (declaredExt && normalizeExt(detected.ext) !== declaredExt) {
      throw new UploadValidationError(
        `Declared .${declaredExt} does not match detected content (${detected.mime}).`,
      );
    }
    return { mime: detected.mime };
  }

  const declared = params.declaredMime?.split(";")[0]?.trim().toLowerCase();
  if (declared && SAFE_TEXT_MIME.has(declared)) {
    return { mime: declared };
  }
  return { mime: "application/octet-stream" };
}
