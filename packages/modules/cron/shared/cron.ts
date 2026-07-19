/**
 * Five-field crontab parser (minute hour day-of-month month day-of-week) with
 * support for wildcards, lists, ranges, steps, and month/weekday names.
 * Follows Vixie cron semantics: when both day-of-month and day-of-week are
 * restricted, a date matches if EITHER field matches.
 */

export type CronFieldName = "minute" | "hour" | "dayOfMonth" | "month" | "dayOfWeek";

export interface CronField {
  /** Allowed values after expansion (day-of-week normalized to 0–6, 0 = Sunday). */
  values: ReadonlySet<number>;
  /** True when the raw field was a bare `*`, i.e. unrestricted. */
  wildcard: boolean;
  /** The raw text of the field as typed. */
  raw: string;
}

export interface ParsedCron {
  minute: CronField;
  hour: CronField;
  dayOfMonth: CronField;
  month: CronField;
  dayOfWeek: CronField;
}

export class CronParseError extends Error {
  constructor(
    public readonly field: CronFieldName | "expression",
    public readonly token: string,
  ) {
    super(`Invalid cron ${field}: "${token}"`);
    this.name = "CronParseError";
  }
}

const MONTH_NAMES: Record<string, number> = {
  jan: 1, feb: 2, mar: 3, apr: 4, may: 5, jun: 6,
  jul: 7, aug: 8, sep: 9, oct: 10, nov: 11, dec: 12,
};

const DAY_NAMES: Record<string, number> = {
  sun: 0, mon: 1, tue: 2, wed: 3, thu: 4, fri: 5, sat: 6,
};

const BOUNDS: Record<CronFieldName, { min: number; max: number }> = {
  minute: { min: 0, max: 59 },
  hour: { min: 0, max: 23 },
  dayOfMonth: { min: 1, max: 31 },
  month: { min: 1, max: 12 },
  dayOfWeek: { min: 0, max: 7 },
};

/** Common shorthand macros accepted in place of a five-field expression. */
export const CRON_MACROS: Record<string, string> = {
  "@yearly": "0 0 1 1 *",
  "@annually": "0 0 1 1 *",
  "@monthly": "0 0 1 * *",
  "@weekly": "0 0 * * 0",
  "@daily": "0 0 * * *",
  "@midnight": "0 0 * * *",
  "@hourly": "0 * * * *",
};

function parseValue(token: string, field: CronFieldName): number {
  const lower = token.toLowerCase();
  if (field === "month" && lower in MONTH_NAMES) return MONTH_NAMES[lower]!;
  if (field === "dayOfWeek" && lower in DAY_NAMES) return DAY_NAMES[lower]!;
  if (!/^\d+$/.test(token)) throw new CronParseError(field, token);
  const value = Number(token);
  const { min, max } = BOUNDS[field];
  if (value < min || value > max) throw new CronParseError(field, token);
  return value;
}

function parseField(raw: string, field: CronFieldName): CronField {
  const { min, max } = BOUNDS[field];
  const values = new Set<number>();
  let wildcard = false;

  for (const part of raw.split(",")) {
    if (part === "") throw new CronParseError(field, raw);
    const [rangeText, stepText, ...extra] = part.split("/");
    if (extra.length > 0 || stepText === "") throw new CronParseError(field, part);
    const step = stepText === undefined ? 1 : Number(stepText);
    if (!Number.isInteger(step) || step < 1) throw new CronParseError(field, part);

    let start: number;
    let end: number;
    if (rangeText === "*") {
      start = min;
      end = max;
      if (step === 1 && raw === "*") wildcard = true;
    } else if (rangeText!.includes("-")) {
      const [a, b, ...rest] = rangeText!.split("-");
      if (rest.length > 0 || !a || !b) throw new CronParseError(field, part);
      start = parseValue(a, field);
      end = parseValue(b, field);
      if (start > end) throw new CronParseError(field, part);
    } else {
      start = parseValue(rangeText!, field);
      // `N/step` means "from N to max, every step"; a bare `N` is just N.
      end = stepText === undefined ? start : max;
    }

    for (let v = start; v <= end; v += step) {
      // Day-of-week 7 is an alias for Sunday.
      values.add(field === "dayOfWeek" ? v % 7 : v);
    }
  }

  return { values, wildcard, raw };
}

export function parseCron(expression: string): ParsedCron {
  const trimmed = expression.trim();
  const expanded = CRON_MACROS[trimmed.toLowerCase()] ?? trimmed;
  const fields = expanded.split(/\s+/);
  if (fields.length !== 5) throw new CronParseError("expression", trimmed);
  return {
    minute: parseField(fields[0]!, "minute"),
    hour: parseField(fields[1]!, "hour"),
    dayOfMonth: parseField(fields[2]!, "dayOfMonth"),
    month: parseField(fields[3]!, "month"),
    dayOfWeek: parseField(fields[4]!, "dayOfWeek"),
  };
}

function dateMatches(cron: ParsedCron, date: Date): boolean {
  if (!cron.month.values.has(date.getMonth() + 1)) return false;
  const domMatch = cron.dayOfMonth.values.has(date.getDate());
  const dowMatch = cron.dayOfWeek.values.has(date.getDay());
  // Vixie cron: both restricted → OR; otherwise the wildcard side always matches.
  if (!cron.dayOfMonth.wildcard && !cron.dayOfWeek.wildcard) {
    return domMatch || dowMatch;
  }
  return domMatch && dowMatch;
}

/** Search horizon: five years of minutes covers every valid expression (incl. Feb 29). */
const MAX_MINUTES = 5 * 366 * 24 * 60;

/**
 * The next `count` run times strictly after `from`, in local time.
 * Returns fewer (possibly zero) results if the expression never fires
 * within the five-year search horizon (e.g. `0 0 31 2 *`).
 */
export function nextRuns(cron: ParsedCron, from: Date, count: number): Date[] {
  const runs: Date[] = [];
  const cursor = new Date(from);
  cursor.setSeconds(0, 0);
  cursor.setMinutes(cursor.getMinutes() + 1);

  for (let i = 0; i < MAX_MINUTES && runs.length < count; i += 1) {
    if (
      cron.minute.values.has(cursor.getMinutes()) &&
      cron.hour.values.has(cursor.getHours()) &&
      dateMatches(cron, cursor)
    ) {
      runs.push(new Date(cursor));
    }
    cursor.setMinutes(cursor.getMinutes() + 1);
  }
  return runs;
}

/**
 * A compact structured summary of one field, for rendering a localized
 * breakdown row without generating free-form prose.
 */
export interface FieldSummary {
  kind: "every" | "values";
  /** Sorted allowed values — present when kind is "values". */
  values: number[];
}

export function summarizeField(field: CronField): FieldSummary {
  if (field.wildcard) return { kind: "every", values: [] };
  return { kind: "values", values: [...field.values].sort((a, b) => a - b) };
}
