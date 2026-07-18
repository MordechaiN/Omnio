import { describe, expect, it } from "vitest";
import { decodeHtml, encodeHtml, runHtml } from "./html-entities.ts";

describe("html entities", () => {
  it("escapes the five special characters", () => {
    expect(encodeHtml(`<a href="x">Tom & 'Jerry'</a>`)).toBe(
      "&lt;a href=&quot;x&quot;&gt;Tom &amp; &#39;Jerry&#39;&lt;/a&gt;",
    );
  });

  it("decodes named, decimal and hex references", () => {
    expect(decodeHtml("&lt;b&gt;&amp;&#169;&#x2122;")).toBe("<b>&©™");
  });

  it("leaves unknown entities untouched", () => {
    expect(decodeHtml("&notareal;")).toBe("&notareal;");
  });

  it("round-trips through runHtml", () => {
    const source = `5 < 6 & "ok"`;
    expect(decodeHtml(runHtml("encode", source))).toBe(source);
  });
});
