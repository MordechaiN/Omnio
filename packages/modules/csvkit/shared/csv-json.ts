/**
 * CSV ⇄ JSON converter — on-device, RFC 4180-style.
 *
 * The parser handles quoted fields, escaped quotes ("") and newlines inside
 * quotes. The first row is treated as the header, so CSV becomes an array of
 * objects and back. No dependency — a small state machine does the parsing.
 */

export interface ConvertResult {
  ok: boolean;
  output?: string;
  error?: string;
}

/** Parse CSV text into a matrix of string cells. */
export function parseCsv(text: string, delimiter: string = ","): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let inQuotes = false;
  let i = 0;

  const pushField = (): void => {
    row.push(field);
    field = "";
  };
  const pushRow = (): void => {
    pushField();
    rows.push(row);
    row = [];
  };

  while (i < text.length) {
    const char = text[i]!;
    if (inQuotes) {
      if (char === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i += 2;
          continue;
        }
        inQuotes = false;
        i += 1;
        continue;
      }
      field += char;
      i += 1;
      continue;
    }
    if (char === '"') {
      inQuotes = true;
      i += 1;
    } else if (char === delimiter) {
      pushField();
      i += 1;
    } else if (char === "\r") {
      i += 1;
    } else if (char === "\n") {
      pushRow();
      i += 1;
    } else {
      field += char;
      i += 1;
    }
  }
  if (field !== "" || row.length > 0) pushRow();
  return rows;
}

function escapeCell(value: string, delimiter: string): string {
  if (value.includes('"') || value.includes(delimiter) || /[\n\r]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

export function csvToJson(input: string, delimiter: string = ","): ConvertResult {
  if (input.trim() === "") return { ok: true, output: "" };
  const rows = parseCsv(input, delimiter).filter((r) => r.length > 1 || r[0] !== "");
  if (rows.length === 0) return { ok: true, output: "[]" };
  const [header, ...body] = rows;
  const records = body.map((cells) => {
    const record: Record<string, string> = {};
    header!.forEach((key, index) => {
      record[key] = cells[index] ?? "";
    });
    return record;
  });
  return { ok: true, output: JSON.stringify(records, null, 2) };
}

export function jsonToCsv(input: string, delimiter: string = ","): ConvertResult {
  if (input.trim() === "") return { ok: true, output: "" };
  let data: unknown;
  try {
    data = JSON.parse(input);
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : String(error) };
  }
  if (!Array.isArray(data)) {
    return { ok: false, error: "Expected a JSON array of objects." };
  }
  if (data.length === 0) return { ok: true, output: "" };
  const keys: string[] = [];
  for (const item of data) {
    if (item && typeof item === "object") {
      for (const key of Object.keys(item as object)) {
        if (!keys.includes(key)) keys.push(key);
      }
    }
  }
  const lines = [keys.map((k) => escapeCell(k, delimiter)).join(delimiter)];
  for (const item of data) {
    const obj = (item ?? {}) as Record<string, unknown>;
    lines.push(
      keys
        .map((key) => {
          const value = obj[key];
          const cell = value === undefined || value === null ? "" : String(value);
          return escapeCell(cell, delimiter);
        })
        .join(delimiter),
    );
  }
  return { ok: true, output: lines.join("\n") };
}
