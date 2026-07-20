import { describe, expect, it } from "vitest";
import { optimizeSvg } from "./svg.ts";

describe("optimizeSvg", () => {
  it("strips prolog, comments, and metadata blocks", () => {
    const input = `<?xml version="1.0"?>
<!-- exported -->
<svg xmlns="http://www.w3.org/2000/svg">
  <title>icon</title>
  <metadata>junk</metadata>
  <path d="M0 0 L10 10"/>
</svg>`;
    const out = optimizeSvg(input);
    expect(out).toBe('<svg xmlns="http://www.w3.org/2000/svg"><path d="M0 0 L10 10"/></svg>');
  });

  it("removes editor namespaces but keeps real attributes", () => {
    const input = '<svg xmlns:inkscape="http://x" inkscape:version="1.2" viewBox="0 0 10 10"><g/></svg>';
    const out = optimizeSvg(input);
    expect(out).toBe('<svg viewBox="0 0 10 10"><g/></svg>');
  });

  it("never alters path data", () => {
    const d = "M 1.5,2.5 C 3 4, 5 6, 7 8 z";
    expect(optimizeSvg(`<svg><path d="${d}"/></svg>`)).toContain(d);
  });
});
