/**
 * HTML entity encode/decode — on-device. Encoding escapes the five characters
 * that matter for safe HTML (& < > " '); an optional "named" mode also maps a
 * common set of named entities. Decoding resolves named, decimal (&#38;) and
 * hex (&#x26;) references.
 */

export type HtmlMode = "encode" | "decode";

const BASIC: Array<[string, string]> = [
  ["&", "&amp;"],
  ["<", "&lt;"],
  [">", "&gt;"],
  ['"', "&quot;"],
  ["'", "&#39;"],
];

const NAMED: Record<string, string> = {
  amp: "&",
  lt: "<",
  gt: ">",
  quot: '"',
  apos: "'",
  nbsp: " ",
  copy: "©",
  reg: "®",
  trade: "™",
  hellip: "…",
  mdash: "—",
  ndash: "–",
  laquo: "«",
  raquo: "»",
  euro: "€",
  pound: "£",
  deg: "°",
};

export function encodeHtml(text: string): string {
  let out = text;
  for (const [char, entity] of BASIC) out = out.split(char).join(entity);
  return out;
}

export function decodeHtml(text: string): string {
  return text.replace(/&(#x?[0-9a-fA-F]+|[a-zA-Z]+);/g, (match, body: string) => {
    if (body[0] === "#") {
      const code =
        body[1] === "x" || body[1] === "X"
          ? Number.parseInt(body.slice(2), 16)
          : Number.parseInt(body.slice(1), 10);
      return Number.isFinite(code) ? String.fromCodePoint(code) : match;
    }
    return NAMED[body] ?? match;
  });
}

export function runHtml(mode: HtmlMode, input: string): string {
  return mode === "encode" ? encodeHtml(input) : decodeHtml(input);
}
