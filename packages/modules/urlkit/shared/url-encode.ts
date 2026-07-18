/**
 * URL encoding/decoding — on-device. "component" uses encodeURIComponent
 * (escapes &, =, ?, / …, right for query values); "full" uses encodeURI
 * (preserves URL structure). Decoding is tolerant of + as space in components.
 */

export type UrlMode = "encode" | "decode";
export type UrlScope = "component" | "full";

export interface UrlResult {
  ok: boolean;
  output: string;
  error?: string;
}

export function runUrl(mode: UrlMode, scope: UrlScope, input: string): UrlResult {
  if (input === "") return { ok: true, output: "" };
  try {
    if (mode === "encode") {
      return {
        ok: true,
        output: scope === "component" ? encodeURIComponent(input) : encodeURI(input),
      };
    }
    const prepared = scope === "component" ? input.replace(/\+/g, " ") : input;
    return {
      ok: true,
      output: scope === "component" ? decodeURIComponent(prepared) : decodeURI(prepared),
    };
  } catch {
    return { ok: false, output: "", error: "Malformed percent-encoding." };
  }
}
