export type FileKind = "image" | "pdf" | "text" | "audio" | "video" | "other";

const TEXT_EXTENSIONS = new Set([
  "txt",
  "md",
  "markdown",
  "json",
  "csv",
  "tsv",
  "xml",
  "yaml",
  "yml",
  "log",
  "ts",
  "tsx",
  "js",
  "jsx",
  "css",
  "html",
  "svg",
]);

const EXTENSION_MIME: Record<string, string> = {
  txt: "text/plain",
  md: "text/markdown",
  json: "application/json",
  csv: "text/csv",
  xml: "application/xml",
  yaml: "application/yaml",
  yml: "application/yaml",
  pdf: "application/pdf",
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  gif: "image/gif",
  webp: "image/webp",
  svg: "image/svg+xml",
};

function extension(name: string): string {
  const dot = name.lastIndexOf(".");
  return dot >= 0 ? name.slice(dot + 1).toLowerCase() : "";
}

/** How the universal viewer should render a file, from its type + extension. */
export function detectKind(file: File): FileKind {
  const type = file.type;
  const ext = extension(file.name);
  if (type.startsWith("image/") || ["png", "jpg", "jpeg", "gif", "webp", "svg"].includes(ext)) {
    return "image";
  }
  if (type === "application/pdf" || ext === "pdf") return "pdf";
  if (type.startsWith("audio/")) return "audio";
  if (type.startsWith("video/")) return "video";
  if (type.startsWith("text/") || type === "application/json" || TEXT_EXTENSIONS.has(ext)) {
    return "text";
  }
  return "other";
}

/** Best-effort MIME for capability lookup; the API re-validates on upload. */
export function detectMime(file: File): string {
  if (file.type) return file.type;
  return EXTENSION_MIME[extension(file.name)] ?? "application/octet-stream";
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  const units = ["KB", "MB", "GB"];
  let value = bytes / 1024;
  let unit = 0;
  while (value >= 1024 && unit < units.length - 1) {
    value /= 1024;
    unit += 1;
  }
  return `${value.toFixed(value < 10 ? 1 : 0)} ${units[unit]}`;
}
