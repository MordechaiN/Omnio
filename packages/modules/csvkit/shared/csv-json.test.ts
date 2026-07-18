import { describe, expect, it } from "vitest";
import { csvToJson, jsonToCsv, parseCsv } from "./csv-json.ts";

describe("parseCsv", () => {
  it("handles quoted fields with commas and newlines", () => {
    const rows = parseCsv('a,b\n"x,1","line\n2"');
    expect(rows).toEqual([
      ["a", "b"],
      ["x,1", "line\n2"],
    ]);
  });

  it("unescapes doubled quotes", () => {
    expect(parseCsv('q\n"say ""hi"""')).toEqual([["q"], ['say "hi"']]);
  });
});

describe("csvToJson", () => {
  it("maps header row to object keys", () => {
    const r = csvToJson("name,age\nAda,36\nGrace,45");
    expect(JSON.parse(r.output!)).toEqual([
      { name: "Ada", age: "36" },
      { name: "Grace", age: "45" },
    ]);
  });

  it("returns empty array for header-only input", () => {
    expect(csvToJson("a,b").output).toBe("[]");
  });
});

describe("jsonToCsv", () => {
  it("emits a header from union of keys", () => {
    const r = jsonToCsv('[{"a":1,"b":2},{"a":3,"c":4}]');
    expect(r.output).toBe("a,b,c\n1,2,\n3,,4");
  });

  it("quotes cells containing the delimiter", () => {
    const r = jsonToCsv('[{"x":"a,b"}]');
    expect(r.output).toBe('x\n"a,b"');
  });

  it("rejects a non-array", () => {
    expect(jsonToCsv('{"a":1}').ok).toBe(false);
  });
});

describe("round trip", () => {
  it("survives CSV → JSON → CSV", () => {
    const csv = "name,age\nAda,36\nGrace,45";
    const json = csvToJson(csv).output!;
    expect(jsonToCsv(json).output).toBe(csv);
  });
});
