/**
 * HTTP header block parsing — accepts raw response/request headers (optionally
 * with a status line) and returns name/value pairs plus the i18n key of an
 * explanation for well-known headers. Pure and unit-tested.
 */
export interface ParsedHeader {
  name: string;
  value: string;
  /** Lowercased canonical name when we have an explanation for it. */
  knownKey?: string;
}

const KNOWN = new Set([
  "content-type",
  "content-length",
  "cache-control",
  "etag",
  "last-modified",
  "location",
  "set-cookie",
  "authorization",
  "content-encoding",
  "access-control-allow-origin",
  "strict-transport-security",
  "content-security-policy",
  "x-frame-options",
  "x-content-type-options",
  "referrer-policy",
  "retry-after",
  "vary",
  "server",
  "user-agent",
  "accept",
  "origin",
  "host",
  "cookie",
  "if-none-match",
  "transfer-encoding",
]);

export interface ParsedHeaderBlock {
  statusLine?: string;
  headers: ParsedHeader[];
}

export function parseHeaderBlock(text: string): ParsedHeaderBlock {
  const lines = text.split(/\r?\n/);
  const headers: ParsedHeader[] = [];
  let statusLine: string | undefined;

  for (const [index, rawLine] of lines.entries()) {
    const line = rawLine.trimEnd();
    if (line.trim() === "") continue;
    // First line may be "HTTP/1.1 200 OK" or "GET /path HTTP/1.1".
    if (index === 0 && !line.includes(":")) {
      statusLine = line.trim();
      continue;
    }
    if (index === 0 && /^(HTTP\/|[A-Z]+ \/)/.test(line) && line.indexOf(" ") < line.indexOf(":")) {
      statusLine = line.trim();
      continue;
    }
    const colon = line.indexOf(":");
    if (colon <= 0) continue;
    const name = line.slice(0, colon).trim();
    const value = line.slice(colon + 1).trim();
    if (!/^[!#$%&'*+.^_`|~0-9A-Za-z-]+$/.test(name)) continue;
    const lower = name.toLowerCase();
    headers.push({ name, value, knownKey: KNOWN.has(lower) ? lower : undefined });
  }
  return { statusLine, headers };
}
