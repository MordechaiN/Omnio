import { describe, expect, it } from "vitest";
import { renderMarkdown } from "./markdown.ts";

describe("renderMarkdown", () => {
  it("renders headings, bold and italic", () => {
    expect(renderMarkdown("# Title")).toContain("<h1>Title</h1>");
    expect(renderMarkdown("**bold**")).toContain("<strong>bold</strong>");
    expect(renderMarkdown("*em*")).toContain("<em>em</em>");
  });

  it("renders lists", () => {
    const html = renderMarkdown("- a\n- b");
    expect(html).toContain("<ul>");
    expect(html).toContain("<li>a</li>");
  });

  it("renders fenced code without transforming its contents", () => {
    const html = renderMarkdown("```\n**not bold**\n```");
    expect(html).toContain("<pre><code>**not bold**</code></pre>");
  });

  it("renders safe links and drops javascript: URLs", () => {
    expect(renderMarkdown("[ok](https://x.com)")).toContain('href="https://x.com"');
    const evil = renderMarkdown("[x](javascript:alert(1))");
    expect(evil).not.toContain("javascript:");
    expect(evil).toContain("x");
  });

  it("escapes raw HTML — no XSS reaches the output", () => {
    const html = renderMarkdown('<script>alert(1)</script>');
    expect(html).not.toContain("<script>");
    expect(html).toContain("&lt;script&gt;");
  });

  it("escapes HTML inside inline code", () => {
    expect(renderMarkdown("`<b>`")).toContain("<code>&lt;b&gt;</code>");
  });

  it("escapes an onerror image payload", () => {
    const html = renderMarkdown('![x](" onerror="alert(1))');
    expect(html).not.toContain("onerror=\"alert");
  });
});
