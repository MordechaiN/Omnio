/**
 * Bulk rename rule engine — a small ordered pipeline of text operations
 * applied to a filename's base (extension preserved). Pure and testable.
 */
export type RenameRule =
  | { type: "findReplace"; find: string; replace: string; useRegex: boolean }
  | { type: "case"; mode: "lower" | "upper" | "title" }
  | { type: "prefix"; text: string }
  | { type: "suffix"; text: string }
  | { type: "sequence"; start: number; digits: number; separator: string };

function splitExt(name: string): { base: string; ext: string } {
  const dot = name.lastIndexOf(".");
  return dot > 0 ? { base: name.slice(0, dot), ext: name.slice(dot) } : { base: name, ext: "" };
}

function toTitleCase(text: string): string {
  return text.replace(/\b\w/g, (char) => char.toUpperCase());
}

export function applyRenameRules(names: string[], rules: RenameRule[]): string[] {
  return names.map((name, index) => {
    const { base, ext } = splitExt(name);
    let result = base;
    for (const rule of rules) {
      switch (rule.type) {
        case "findReplace":
          if (rule.find === "") break;
          result = rule.useRegex
            ? result.replace(new RegExp(rule.find, "g"), rule.replace)
            : result.split(rule.find).join(rule.replace);
          break;
        case "case":
          result =
            rule.mode === "lower" ? result.toLowerCase() : rule.mode === "upper" ? result.toUpperCase() : toTitleCase(result);
          break;
        case "prefix":
          result = rule.text + result;
          break;
        case "suffix":
          result += rule.text;
          break;
        case "sequence":
          result += rule.separator + String(rule.start + index).padStart(rule.digits, "0");
          break;
      }
    }
    return result + ext;
  });
}
