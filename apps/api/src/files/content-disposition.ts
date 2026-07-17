/**
 * Build a safe `Content-Disposition: attachment` header. The filename is display
 * metadata only (docs/architecture/06-security.md §3): control characters and
 * quotes are stripped for the ASCII fallback, and the exact name is carried in
 * the RFC 5987 `filename*` parameter.
 */
export function attachmentDisposition(originalName: string): string {
  const fallback = originalName.replace(/[^\x20-\x7e]/g, "_").replace(/["\\]/g, "_") || "download";
  const encoded = encodeURIComponent(originalName);
  return `attachment; filename="${fallback}"; filename*=UTF-8''${encoded}`;
}
