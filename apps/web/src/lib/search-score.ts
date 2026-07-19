/**
 * The palette's ranking function. cmdk calls filter(value, search, keywords)
 * per item and sorts by the returned score (0 = filtered out). Tiers:
 *
 *   exact match        1.0
 *   prefix match       0.9
 *   word-prefix match  0.8   ("form" → "JSON Formatter")
 *   substring          0.7
 *   subsequence        0.4   (all query chars appear in order)
 *   typo (edit ≤ 1–2)  0.3   ("pasword" → "password")
 *
 * The best tier across value + keywords wins; personal boosts (favorites,
 * recent use) are added by the caller via makePaletteFilter so frequently
 * used tools surface first among equals.
 */

/** Damerau-ish edit distance, capped — bails early once > max. */
export function boundedEditDistance(a: string, b: string, max: number): number {
  if (Math.abs(a.length - b.length) > max) return max + 1;
  const previous = new Array<number>(b.length + 1);
  const current = new Array<number>(b.length + 1);
  for (let j = 0; j <= b.length; j += 1) previous[j] = j;
  for (let i = 1; i <= a.length; i += 1) {
    current[0] = i;
    let rowMin = current[0];
    for (let j = 1; j <= b.length; j += 1) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      current[j] = Math.min(previous[j]! + 1, current[j - 1]! + 1, previous[j - 1]! + cost);
      rowMin = Math.min(rowMin!, current[j]!);
    }
    if (rowMin! > max) return max + 1;
    for (let j = 0; j <= b.length; j += 1) previous[j] = current[j]!;
  }
  return previous[b.length]!;
}

function isSubsequence(query: string, text: string): boolean {
  let i = 0;
  for (const char of text) {
    if (char === query[i]) i += 1;
    if (i === query.length) return true;
  }
  return i === query.length;
}

/** Score one text against the query on the tier ladder (0..1). */
export function scoreText(query: string, text: string): number {
  const q = query.toLowerCase().trim();
  const t = text.toLowerCase();
  if (q === "" || t === "") return 0;
  if (t === q) return 1;
  if (t.startsWith(q)) return 0.9;
  if (t.split(/[\s-_./]+/).some((word) => word.startsWith(q))) return 0.8;
  if (t.includes(q)) return 0.7;
  if (q.length >= 3 && isSubsequence(q, t)) return 0.4;
  if (q.length >= 4) {
    // Typo tolerance against whole text and against each word.
    const budget = q.length >= 7 ? 2 : 1;
    for (const word of t.split(/[\s-_./]+/)) {
      if (boundedEditDistance(q, word, budget) <= budget) return 0.3;
    }
  }
  return 0;
}

/** Best score across an item's value and its keywords. */
export function scoreItem(query: string, value: string, keywords: readonly string[] = []): number {
  let best = scoreText(query, value);
  for (const keyword of keywords) {
    if (best >= 0.9) break;
    // Keyword hits rank a shade under the same hit on the visible name.
    best = Math.max(best, scoreText(query, keyword) * 0.95);
  }
  return best;
}

export interface PersonalBoosts {
  /** Item values (lowercased tool names) that are favorited. */
  favorites: ReadonlySet<string>;
  /** Item values recently used, most recent first. */
  recents: readonly string[];
}

/**
 * Build the cmdk filter. Personal boosts are small additive nudges — they
 * reorder near-ties, never resurrect a non-match.
 */
export function makePaletteFilter(boosts: PersonalBoosts) {
  return (value: string, search: string, keywords?: string[]): number => {
    const base = scoreItem(search, value, keywords ?? []);
    if (base === 0) return 0;
    let boost = 0;
    const key = value.toLowerCase();
    if (boosts.favorites.has(key)) boost += 0.06;
    const recentIndex = boosts.recents.indexOf(key);
    if (recentIndex >= 0) boost += Math.max(0.01, 0.05 - recentIndex * 0.01);
    return Math.min(1, base + boost);
  };
}
