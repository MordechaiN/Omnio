/**
 * Prompt formatting — whitespace normalization for pasting a prompt into any
 * chat UI cleanly: collapse repeated blank lines, strip trailing spaces,
 * de-indent uniformly, and optionally hard-wrap to a column width.
 */
export interface FormatOptions {
  collapseBlankLines: boolean;
  trimTrailingSpaces: boolean;
  dedent: boolean;
  wrapWidth: number | null;
}

function dedentText(text: string): string {
  const lines = text.split("\n");
  const indents = lines
    .filter((line) => line.trim() !== "")
    .map((line) => line.match(/^ */)![0]!.length);
  const min = indents.length > 0 ? Math.min(...indents) : 0;
  return min === 0 ? text : lines.map((line) => line.slice(min)).join("\n");
}

function wrapLine(line: string, width: number): string[] {
  if (line.length <= width) return [line];
  const words = line.split(" ");
  const wrapped: string[] = [];
  let current = "";
  for (const word of words) {
    const candidate = current === "" ? word : `${current} ${word}`;
    if (candidate.length > width && current !== "") {
      wrapped.push(current);
      current = word;
    } else {
      current = candidate;
    }
  }
  if (current !== "") wrapped.push(current);
  return wrapped;
}

export function formatPrompt(text: string, options: FormatOptions): string {
  let result = text;
  if (options.dedent) result = dedentText(result);
  if (options.trimTrailingSpaces) {
    result = result
      .split("\n")
      .map((line) => line.replace(/[ \t]+$/, ""))
      .join("\n");
  }
  if (options.collapseBlankLines) {
    result = result.replace(/\n{3,}/g, "\n\n");
  }
  if (options.wrapWidth) {
    const width = options.wrapWidth;
    result = result
      .split("\n")
      .flatMap((line) => wrapLine(line, width))
      .join("\n");
  }
  return result.trim();
}
