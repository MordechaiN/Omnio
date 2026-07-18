import { describe, expect, it } from "vitest";
import { formatJson } from "./json-format.ts";

describe("formatJson", () => {
  it("pretty-prints with a 2-space indent", () => {
    const result = formatJson('{"a":1,"b":[2,3]}', "2");
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.output).toBe('{\n  "a": 1,\n  "b": [\n    2,\n    3\n  ]\n}');
  });

  it("supports a 4-space indent", () => {
    const result = formatJson('{"a":1}', "4");
    expect(result.ok && result.output).toBe('{\n    "a": 1\n}');
  });

  it("supports tab indentation", () => {
    const result = formatJson('{"a":1}', "tab");
    expect(result.ok && result.output).toBe('{\n\t"a": 1\n}');
  });

  it("minifies", () => {
    const result = formatJson('{\n  "a": 1\n}', "minify");
    expect(result.ok && result.output).toBe('{"a":1}');
  });

  it("reports invalid JSON with a message", () => {
    const result = formatJson('{"a": }', "2");
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.message).toBeTruthy();
  });

  it("recovers a line/column for a positional parse error", () => {
    const result = formatJson('{"a":1 "b":2}', "2");
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.line).toBe(1);
      expect(result.column).toBeGreaterThan(1);
    }
  });

  it("rejects empty input", () => {
    const result = formatJson("   ", "2");
    expect(result.ok).toBe(false);
  });

  it("preserves unicode and nested structure round-trips", () => {
    const value = { greeting: "שלום", nested: { list: [1, 2, { x: true }] } };
    const formatted = formatJson(JSON.stringify(value), "2");
    expect(formatted.ok).toBe(true);
    if (formatted.ok) expect(JSON.parse(formatted.output)).toEqual(value);
  });
});
