import { describe, expect, it } from "vitest";
import { formatXml, minifyXml } from "./format.ts";

describe("formatXml", () => {
  it("indents nested elements", () => {
    expect(formatXml("<a><b><c>x</c></b></a>")).toBe(
      ["<a>", "  <b>", "    <c>", "      x", "    </c>", "  </b>", "</a>"].join("\n"),
    );
  });

  it("keeps self-closing tags, declarations, and comments at level", () => {
    expect(formatXml('<?xml version="1.0"?><a><b/></a>')).toBe(
      ['<?xml version="1.0"?>', "<a>", "  <b/>", "</a>"].join("\n"),
    );
    expect(formatXml("<a><!-- note --><b/></a>")).toContain("  <!-- note -->");
  });
});

describe("minifyXml", () => {
  it("collapses inter-tag whitespace", () => {
    expect(minifyXml("<a>\n  <b>x</b>\n</a>")).toBe("<a><b>x</b></a>");
  });
});
