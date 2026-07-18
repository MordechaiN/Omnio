/**
 * Regex testing — on-device. Compiles a user pattern safely (invalid patterns
 * are reported, never thrown) and returns every match with its captured groups
 * and index. Global matching is capped to avoid pathological loops.
 */

export interface RegexMatch {
  match: string;
  index: number;
  groups: string[];
  namedGroups: Record<string, string>;
}

export interface RegexResult {
  ok: boolean;
  error?: string;
  matches: RegexMatch[];
}

const MAX_MATCHES = 10000;

export function testRegex(pattern: string, flags: string, input: string): RegexResult {
  if (pattern === "") return { ok: true, matches: [] };

  let regex: RegExp;
  try {
    regex = new RegExp(pattern, flags.includes("g") ? flags : `${flags}g`);
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : String(error), matches: [] };
  }

  const matches: RegexMatch[] = [];
  let match: RegExpExecArray | null;
  while ((match = regex.exec(input)) !== null) {
    matches.push({
      match: match[0],
      index: match.index,
      groups: match.slice(1).map((group) => group ?? ""),
      namedGroups: { ...match.groups },
    });
    if (match.index === regex.lastIndex) regex.lastIndex += 1; // zero-width guard
    if (matches.length >= MAX_MATCHES) break;
  }
  return { ok: true, matches };
}

/** Replace using the pattern; $1, $<name> etc. honored by String.replace. */
export function replaceRegex(
  pattern: string,
  flags: string,
  input: string,
  replacement: string,
): { ok: boolean; output?: string; error?: string } {
  if (pattern === "") return { ok: true, output: input };
  try {
    const regex = new RegExp(pattern, flags);
    return { ok: true, output: input.replace(regex, replacement) };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : String(error) };
  }
}
