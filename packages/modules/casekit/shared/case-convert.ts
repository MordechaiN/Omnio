/**
 * Case conversion — on-device. Words are detected across spaces, hyphens,
 * underscores, and camelCase boundaries, so any input style converts to any
 * target style. Unicode letters (incl. Hebrew) are preserved.
 */

export const CASES = [
  "upper",
  "lower",
  "title",
  "sentence",
  "camel",
  "pascal",
  "snake",
  "constant",
  "kebab",
] as const;
export type CaseId = (typeof CASES)[number];

/** Split arbitrary text into words, honoring camelCase and separators. */
export function toWords(input: string): string[] {
  return input
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .replace(/([A-Z]+)([A-Z][a-z])/g, "$1 $2")
    .split(/[\s_-]+/)
    .filter(Boolean);
}

function titleCaseWord(word: string): string {
  return word.charAt(0).toLocaleUpperCase() + word.slice(1).toLocaleLowerCase();
}

export function convertCase(input: string, target: CaseId): string {
  if (input.trim() === "") return "";
  if (target === "upper") return input.toLocaleUpperCase();
  if (target === "lower") return input.toLocaleLowerCase();

  const words = toWords(input);
  if (words.length === 0) return "";

  switch (target) {
    case "title":
      return words.map(titleCaseWord).join(" ");
    case "sentence": {
      const lower = words.map((w) => w.toLocaleLowerCase());
      lower[0] = titleCaseWord(lower[0]!);
      return lower.join(" ");
    }
    case "camel":
      return words
        .map((w, i) => (i === 0 ? w.toLocaleLowerCase() : titleCaseWord(w)))
        .join("");
    case "pascal":
      return words.map(titleCaseWord).join("");
    case "snake":
      return words.map((w) => w.toLocaleLowerCase()).join("_");
    case "constant":
      return words.map((w) => w.toLocaleUpperCase()).join("_");
    case "kebab":
      return words.map((w) => w.toLocaleLowerCase()).join("-");
    default:
      return input;
  }
}
