/**
 * Calendar date math — on-device.
 *
 * `diffYMD` gives a human years/months/days breakdown by borrowing from the
 * later date's month lengths, the same way you'd compute an age by hand.
 * `totalDays` is the plain day count. Both take dates ordered start → end and
 * assume UTC midnights, so daylight-saving shifts never skew the result.
 */

export interface Ymd {
  years: number;
  months: number;
  days: number;
}

const MS_PER_DAY = 86_400_000;

function daysInMonth(year: number, monthIndex: number): number {
  return new Date(Date.UTC(year, monthIndex + 1, 0)).getUTCDate();
}

/** Add `n` whole months, clamping the day to the target month's length. */
function addMonths(date: Date, n: number): Date {
  const total = date.getUTCMonth() + n;
  const year = date.getUTCFullYear() + Math.floor(total / 12);
  const month = ((total % 12) + 12) % 12;
  const day = Math.min(date.getUTCDate(), daysInMonth(year, month));
  return new Date(Date.UTC(year, month, day));
}

export function diffYMD(start: Date, end: Date): Ymd {
  let from = start;
  let to = end;
  if (from > to) [from, to] = [to, from];

  // Count whole months, then measure the leftover days from the month anchor.
  let months = (to.getUTCFullYear() - from.getUTCFullYear()) * 12 + (to.getUTCMonth() - from.getUTCMonth());
  if (to.getUTCDate() < from.getUTCDate()) months -= 1;

  const anchor = addMonths(from, months);
  const days = totalDays(anchor, to);
  return { years: Math.floor(months / 12), months: months % 12, days };
}

export function totalDays(start: Date, end: Date): number {
  const a = Date.UTC(start.getUTCFullYear(), start.getUTCMonth(), start.getUTCDate());
  const b = Date.UTC(end.getUTCFullYear(), end.getUTCMonth(), end.getUTCDate());
  return Math.round(Math.abs(b - a) / MS_PER_DAY);
}

/** Parse a yyyy-mm-dd string as a UTC date, or null. */
export function parseDate(value: string): Date | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value.trim());
  if (!match) return null;
  const [, y, m, d] = match.map(Number) as [number, number, number, number];
  const date = new Date(Date.UTC(y, m - 1, d));
  if (date.getUTCMonth() !== m - 1 || date.getUTCDate() !== d) return null;
  return date;
}
