/**
 * Compact "how long ago" formatting via Intl.RelativeTimeFormat — localized
 * for free, no library. Falls back through minutes → hours → days → weeks.
 */
export function formatRelativeTime(locale: string, epochMs: number, now = Date.now()): string {
  const rtf = new Intl.RelativeTimeFormat(locale, { numeric: "auto", style: "narrow" });
  const seconds = Math.round((epochMs - now) / 1000);
  const abs = Math.abs(seconds);
  if (abs < 60) return rtf.format(0, "minute");
  if (abs < 3600) return rtf.format(Math.trunc(seconds / 60), "minute");
  if (abs < 86400) return rtf.format(Math.trunc(seconds / 3600), "hour");
  if (abs < 604800) return rtf.format(Math.trunc(seconds / 86400), "day");
  return rtf.format(Math.trunc(seconds / 604800), "week");
}
