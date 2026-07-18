/**
 * JSON formatting/validation logic — pure, runs entirely on-device.
 * Reused by the surface and covered directly by tests.
 */

export type IndentStyle = "2" | "4" | "tab" | "minify";

export interface FormatSuccess {
  ok: true;
  output: string;
}

export interface FormatFailure {
  ok: false;
  /** Human-readable parse error. */
  message: string;
  /** 1-based line/column of the error when we can recover it. */
  line?: number;
  column?: number;
}

export type FormatResult = FormatSuccess | FormatFailure;

function indentFor(style: IndentStyle): string | number {
  switch (style) {
    case "2":
      return 2;
    case "4":
      return 4;
    case "tab":
      return "\t";
    case "minify":
      return 0;
  }
}

/**
 * Recover a 1-based line/column from a JSON.parse error message. Modern V8
 * often appends "(line L column C)"; otherwise it gives "position N", which we
 * translate against the source. Some errors carry neither — then we report none.
 */
function locate(source: string, message: string): { line?: number; column?: number } {
  const lineCol = /line (\d+) column (\d+)/.exec(message);
  if (lineCol) return { line: Number(lineCol[1]), column: Number(lineCol[2]) };

  const positional = /position (\d+)/.exec(message);
  if (!positional) return {};
  const position = Number(positional[1]);
  let line = 1;
  let column = 1;
  for (let i = 0; i < position && i < source.length; i += 1) {
    if (source[i] === "\n") {
      line += 1;
      column = 1;
    } else {
      column += 1;
    }
  }
  return { line, column };
}

export function formatJson(input: string, style: IndentStyle): FormatResult {
  const trimmed = input.trim();
  if (trimmed === "") {
    return { ok: false, message: "Nothing to format — paste some JSON first." };
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(trimmed);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return { ok: false, message, ...locate(trimmed, message) };
  }
  const indent = indentFor(style);
  const output = style === "minify" ? JSON.stringify(parsed) : JSON.stringify(parsed, null, indent);
  return { ok: true, output };
}
