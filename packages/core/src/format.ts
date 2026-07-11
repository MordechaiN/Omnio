const UNITS = ["B", "KB", "MB", "GB", "TB"] as const;

/**
 * Human-readable byte size (binary steps, decimal labels — the convention
 * users expect from their OS file manager). Locale-aware digit formatting
 * happens at the UI layer via Intl; this returns the canonical form.
 */
export function formatBytes(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes < 0) {
    throw new RangeError(`formatBytes expects a non-negative finite number, got ${bytes}`);
  }
  if (bytes < 1024) return `${bytes} B`;

  let value = bytes;
  let unit = 0;
  while (value >= 1024 && unit < UNITS.length - 1) {
    value /= 1024;
    unit += 1;
  }
  const rounded = value >= 100 ? Math.round(value).toString() : value.toFixed(1);
  return `${rounded} ${UNITS[unit]}`;
}
