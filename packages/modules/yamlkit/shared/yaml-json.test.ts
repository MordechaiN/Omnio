import { describe, expect, it } from "vitest";
import { jsonToYaml, yamlToJson } from "./yaml-json.ts";

describe("yamlToJson", () => {
  it("converts a mapping to JSON", () => {
    const r = yamlToJson("name: Omnio\nport: 4200");
    expect(JSON.parse(r.output!)).toEqual({ name: "Omnio", port: 4200 });
  });

  it("converts nested lists", () => {
    const r = yamlToJson("items:\n  - a\n  - b");
    expect(JSON.parse(r.output!)).toEqual({ items: ["a", "b"] });
  });

  it("reports a syntax error", () => {
    const r = yamlToJson("a:\n  - b\n - c");
    expect(r.ok).toBe(false);
    expect(r.error).toBeTruthy();
  });
});

describe("jsonToYaml", () => {
  it("converts JSON to YAML", () => {
    const r = jsonToYaml('{"name":"Omnio","tags":["a","b"]}');
    expect(r.output).toContain("name: Omnio");
    expect(r.output).toContain("- a");
  });

  it("reports invalid JSON", () => {
    expect(jsonToYaml("{nope}").ok).toBe(false);
  });
});

describe("round trip", () => {
  it("survives YAML → JSON → YAML", () => {
    const yaml = "a: 1\nb:\n  - x\n  - y\n";
    const json = yamlToJson(yaml).output!;
    const back = jsonToYaml(json).output!;
    expect(yamlToJson(back).output).toBe(json);
  });
});
