/**
 * Line operations — on-device, order-preserving where it matters. Every
 * operation takes and returns text; the surface chains them via the UI.
 */

export interface LineOptions {
  trim: boolean;
  caseInsensitive: boolean;
}

const DEFAULTS: LineOptions = { trim: false, caseInsensitive: false };

function toLines(text: string): string[] {
  return text.split(/\r?\n/);
}

function key(line: string, options: LineOptions): string {
  let value = options.trim ? line.trim() : line;
  if (options.caseInsensitive) value = value.toLowerCase();
  return value;
}

export function sortLines(text: string, direction: "asc" | "desc", options = DEFAULTS): string {
  const lines = toLines(text).sort((a, b) =>
    key(a, options).localeCompare(key(b, options), undefined, { numeric: true }),
  );
  if (direction === "desc") lines.reverse();
  return lines.join("\n");
}

export function dedupeLines(text: string, options = DEFAULTS): string {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const line of toLines(text)) {
    const k = key(line, options);
    if (!seen.has(k)) {
      seen.add(k);
      out.push(line);
    }
  }
  return out.join("\n");
}

export function reverseLines(text: string): string {
  return toLines(text).reverse().join("\n");
}

export function shuffleLines(text: string, random: () => number = Math.random): string {
  const lines = toLines(text);
  for (let i = lines.length - 1; i > 0; i -= 1) {
    const j = Math.floor(random() * (i + 1));
    [lines[i], lines[j]] = [lines[j]!, lines[i]!];
  }
  return lines.join("\n");
}

export function removeBlankLines(text: string): string {
  return toLines(text)
    .filter((line) => line.trim() !== "")
    .join("\n");
}

export function trimLines(text: string): string {
  return toLines(text)
    .map((line) => line.trim())
    .join("\n");
}
