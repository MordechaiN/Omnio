/** Extension ⇄ MIME reference table for the lookup tool. */
export interface MimeEntry {
  extension: string;
  mime: string;
  label: string;
}

export const MIME_TYPES: MimeEntry[] = [
  { extension: "html", mime: "text/html", label: "HTML document" },
  { extension: "css", mime: "text/css", label: "Stylesheet" },
  { extension: "js", mime: "text/javascript", label: "JavaScript" },
  { extension: "mjs", mime: "text/javascript", label: "JavaScript module" },
  { extension: "json", mime: "application/json", label: "JSON data" },
  { extension: "xml", mime: "application/xml", label: "XML document" },
  { extension: "csv", mime: "text/csv", label: "Comma-separated values" },
  { extension: "txt", mime: "text/plain", label: "Plain text" },
  { extension: "md", mime: "text/markdown", label: "Markdown" },
  { extension: "pdf", mime: "application/pdf", label: "PDF document" },
  { extension: "zip", mime: "application/zip", label: "ZIP archive" },
  { extension: "gz", mime: "application/gzip", label: "Gzip archive" },
  { extension: "tar", mime: "application/x-tar", label: "Tar archive" },
  { extension: "7z", mime: "application/x-7z-compressed", label: "7-Zip archive" },
  { extension: "png", mime: "image/png", label: "PNG image" },
  { extension: "jpg", mime: "image/jpeg", label: "JPEG image" },
  { extension: "jpeg", mime: "image/jpeg", label: "JPEG image" },
  { extension: "gif", mime: "image/gif", label: "GIF image" },
  { extension: "webp", mime: "image/webp", label: "WebP image" },
  { extension: "avif", mime: "image/avif", label: "AVIF image" },
  { extension: "svg", mime: "image/svg+xml", label: "SVG vector image" },
  { extension: "ico", mime: "image/x-icon", label: "Icon" },
  { extension: "mp3", mime: "audio/mpeg", label: "MP3 audio" },
  { extension: "wav", mime: "audio/wav", label: "WAV audio" },
  { extension: "ogg", mime: "audio/ogg", label: "Ogg audio" },
  { extension: "m4a", mime: "audio/mp4", label: "AAC audio" },
  { extension: "flac", mime: "audio/flac", label: "FLAC audio" },
  { extension: "mp4", mime: "video/mp4", label: "MP4 video" },
  { extension: "webm", mime: "video/webm", label: "WebM video" },
  { extension: "mov", mime: "video/quicktime", label: "QuickTime video" },
  { extension: "mkv", mime: "video/x-matroska", label: "Matroska video" },
  { extension: "woff", mime: "font/woff", label: "Web font" },
  { extension: "woff2", mime: "font/woff2", label: "Web font 2" },
  { extension: "ttf", mime: "font/ttf", label: "TrueType font" },
  { extension: "otf", mime: "font/otf", label: "OpenType font" },
  { extension: "doc", mime: "application/msword", label: "Word document (legacy)" },
  { extension: "docx", mime: "application/vnd.openxmlformats-officedocument.wordprocessingml.document", label: "Word document" },
  { extension: "xls", mime: "application/vnd.ms-excel", label: "Excel spreadsheet (legacy)" },
  { extension: "xlsx", mime: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", label: "Excel spreadsheet" },
  { extension: "ppt", mime: "application/vnd.ms-powerpoint", label: "PowerPoint (legacy)" },
  { extension: "pptx", mime: "application/vnd.openxmlformats-officedocument.presentationml.presentation", label: "PowerPoint" },
  { extension: "wasm", mime: "application/wasm", label: "WebAssembly" },
  { extension: "epub", mime: "application/epub+zip", label: "EPUB book" },
  { extension: "ics", mime: "text/calendar", label: "Calendar" },
  { extension: "yaml", mime: "application/yaml", label: "YAML" },
  { extension: "toml", mime: "application/toml", label: "TOML" },
  { extension: "sh", mime: "application/x-sh", label: "Shell script" },
];

export function searchMime(query: string): MimeEntry[] {
  const q = query.trim().toLowerCase().replace(/^\./, "");
  if (q === "") return MIME_TYPES;
  return MIME_TYPES.filter(
    (entry) =>
      entry.extension.includes(q) ||
      entry.mime.toLowerCase().includes(q) ||
      entry.label.toLowerCase().includes(q),
  );
}
