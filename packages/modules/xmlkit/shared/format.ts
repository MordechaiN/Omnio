/**
 * XML pretty-printer — token-based, dependency-free, and pure so it's
 * testable. Validation happens in the surface via DOMParser (browser-only);
 * this file only handles layout.
 */
export function formatXml(input: string, indent = "  "): string {
  const trimmed = input.trim();
  // Tokenize into tags and text runs.
  const tokens = trimmed.split(/(<[^>]+>)/g).filter((token) => token.trim() !== "");
  let depth = 0;
  const lines: string[] = [];
  for (const token of tokens) {
    const isTag = token.startsWith("<");
    const isClosing = /^<\/[^>]+>$/.test(token);
    const isSelfClosing = /\/>$/.test(token) || /^<\?/.test(token) || /^<!/.test(token);
    if (isClosing) depth = Math.max(0, depth - 1);
    lines.push(indent.repeat(depth) + token.trim());
    if (isTag && !isClosing && !isSelfClosing) depth += 1;
  }
  return lines.join("\n");
}

export function minifyXml(input: string): string {
  return input
    .replace(/>\s+</g, "><")
    .trim();
}
