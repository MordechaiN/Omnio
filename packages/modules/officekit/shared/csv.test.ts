import { describe, expect, it } from "vitest";
import { parseCsv } from "./csv.ts";

describe("parseCsv", () => {
  it("parses plain rows", () => {
    expect(parseCsv("a,b\n1,2")).toEqual([["a", "b"], ["1", "2"]]);
  });

  it("handles quoted fields with commas, quotes, and newlines", () => {
    expect(parseCsv('name,note\n"Doe, Jane","said ""hi""\nbye"')).toEqual([
      ["name", "note"],
      ["Doe, Jane", 'said "hi"\nbye'],
    ]);
  });

  it("tolerates CRLF and trailing newline", () => {
    expect(parseCsv("a,b\r\n1,2\r\n")).toEqual([["a", "b"], ["1", "2"]]);
  });

  it("keeps empty fields", () => {
    expect(parseCsv("a,,c\n,,")).toEqual([["a", "", "c"], ["", "", ""]]);
  });

  it("supports tab as the delimiter (TSV)", () => {
    expect(parseCsv("a\tb\n1\t2", "\t")).toEqual([["a", "b"], ["1", "2"]]);
    expect(parseCsv('name\tnote\n"Doe\tJane"\tok', "\t")).toEqual([
      ["name", "note"],
      ["Doe\tJane", "ok"],
    ]);
  });
});
