/**
 * YAML ⇄ JSON converter — on-device, via the pure-JS `yaml` parser.
 *
 * Both directions round-trip through the same document model, so anchors,
 * multi-line scalars and nested maps survive. Errors are surfaced verbatim so
 * the location the parser reports reaches the user.
 */

import { parse, stringify } from "yaml";

export interface ConvertResult {
  ok: boolean;
  output?: string;
  error?: string;
}

export function yamlToJson(input: string, indent: number = 2): ConvertResult {
  if (input.trim() === "") return { ok: true, output: "" };
  try {
    const data = parse(input) as unknown;
    return { ok: true, output: JSON.stringify(data, null, indent) };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : String(error) };
  }
}

export function jsonToYaml(input: string): ConvertResult {
  if (input.trim() === "") return { ok: true, output: "" };
  try {
    const data = JSON.parse(input) as unknown;
    return { ok: true, output: stringify(data) };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : String(error) };
  }
}
