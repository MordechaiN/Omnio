import { describe, expect, it } from "vitest";
import { renderMarkdown } from "./markdown.ts";

/**
 * Hostile input.
 *
 * The renderer's promise is that raw HTML never survives. These are the
 * payloads that would break it. In a local-first product an XSS is not a
 * defacement: script running on this origin can read the whole OPFS workspace,
 * which is every document the person owns. So the guarantee is worth attacking
 * rather than trusting a comment about.
 */
describe("markdown renderer under attack", () => {
  const PAYLOADS = [
    "<script>alert(1)</script>",
    "<img src=x onerror=alert(1)>",
    "<svg/onload=alert(1)>",
    "<iframe src=javascript:alert(1)></iframe>",
    "[click](javascript:alert(1))",
    "[click](JaVaScRiPt:alert(1))",
    "[click](\tjavascript:alert(1))",
    "[click](data:text/html,<script>alert(1)</script>)",
    "[click](vbscript:msgbox(1))",
    "![img](x\" onerror=\"alert(1))",
    "**bold<script>alert(1)</script>**",
    "`code</code><script>alert(1)</script>`",
    "<a href=\"#\" onclick=\"alert(1)\">x</a>",
    "<body onload=alert(1)>",
    "<<script>script>alert(1)<</script>/script>",
    "[a](https://ok.test) <img src=x onerror=alert(1)>",
    "> <script>alert(1)</script>",
    "- <img src=x onerror=alert(1)>",
    "# <script>alert(1)</script>",
  ];

  /** Tags the renderer is allowed to emit. Anything else is a hole. */
  const ALLOWED = new Set([
    "p", "br", "h1", "h2", "h3", "h4", "h5", "h6",
    "strong", "em", "code", "pre", "ul", "ol", "li", "blockquote", "a", "hr",
  ]);

  for (const payload of PAYLOADS) {
    it(`neutralises ${JSON.stringify(payload).slice(0, 44)}`, () => {
      const html = renderMarkdown(payload);

      // Assert on markup, not on text. An escaped "onerror=" sitting inside a
      // paragraph is inert; a first pass of this test failed on exactly that and
      // would have had me "fix" a renderer that was already correct.
      for (const match of html.matchAll(/<\/?([a-z0-9-]+)/gi)) {
        expect(ALLOWED.has((match[1] ?? "").toLowerCase())).toBe(true);
      }

      // No event handler may appear inside a tag.
      for (const [tag] of html.matchAll(/<[^>]*>/g)) {
        expect(tag).not.toMatch(/\son\w+\s*=/i);
      }

      // Every link target must be a scheme we chose to allow.
      for (const [, href] of html.matchAll(/href="([^"]*)"/gi)) {
        expect(href).not.toMatch(/^\s*(javascript|data|vbscript):/i);
      }
    });
  }

  it("still renders the safe subset it promises", () => {
    const html = renderMarkdown("# Title\n\n**bold** and [a link](https://omnio.dev)");
    expect(html).toContain("<h1>");
    expect(html).toContain("<strong>");
    expect(html).toContain('href="https://omnio.dev"');
    expect(html).toContain('rel="noopener noreferrer nofollow"');
  });
});
