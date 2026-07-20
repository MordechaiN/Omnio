/**
 * Prompt template + token math, pure and unit-tested. Local-first by design:
 * the same interfaces can later feed a provider adapter without touching the
 * UI (templates in → filled prompt out; text in → estimate out).
 */

/** Unique {{variable}} names in first-appearance order. */
export function extractVariables(template: string): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const match of template.matchAll(/\{\{\s*([a-zA-Z0-9_.-]+)\s*\}\}/g)) {
    const name = match[1]!;
    if (!seen.has(name)) {
      seen.add(name);
      out.push(name);
    }
  }
  return out;
}

/** Fill a template; missing values keep the placeholder so gaps stay visible. */
export function fillTemplate(template: string, values: Record<string, string>): string {
  return template.replace(/\{\{\s*([a-zA-Z0-9_.-]+)\s*\}\}/g, (whole, name: string) => {
    const value = values[name];
    return value === undefined || value === "" ? whole : value;
  });
}

export interface TokenEstimate {
  characters: number;
  words: number;
  /** Heuristic: ~4 characters per token for English-like text, word-bounded. */
  tokens: number;
}

export function estimateTokens(text: string): TokenEstimate {
  const characters = text.length;
  const words = text.trim() === "" ? 0 : text.trim().split(/\s+/).length;
  // Blend of the two classic rules of thumb (chars/4 and words×4/3),
  // which tracks BPE tokenizers within ~10–15% on typical prose.
  const tokens = Math.round((characters / 4 + (words * 4) / 3) / 2);
  return { characters, words, tokens };
}
