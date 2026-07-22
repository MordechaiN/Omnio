// Spike: what can mupdf 1.28 actually do in-process? Structured text, page
// render (for OCR pre-render + editor canvas fallback), embedded-image extract,
// outlines/bookmarks, and PDF/A save. Log real output; record pass/fail per cap.
import * as mupdf from "mupdf";
import { readFileSync, writeFileSync } from "node:fs";

const bytes = new Uint8Array(readFileSync(new URL("./fixtures/sample.pdf", import.meta.url)));
const results = {};

function cap(name, fn) {
  try {
    const out = fn();
    results[name] = { ok: true, note: out };
    console.log(`PASS ${name}: ${out}`);
  } catch (e) {
    results[name] = { ok: false, note: String(e && e.message || e) };
    console.log(`FAIL ${name}: ${e && e.message || e}`);
  }
}

const doc = mupdf.Document.openDocument(bytes, "application/pdf");
console.log("pages:", doc.countPages());

cap("structured-text", () => {
  const page = doc.loadPage(0);
  const st = page.toStructuredText("preserve-whitespace");
  const json = st.asJSON();
  const parsed = JSON.parse(json);
  const words = JSON.stringify(parsed).slice(0, 120);
  return `json ${json.length}B, sample=${words}`;
});

cap("render-pixmap-png", () => {
  const page = doc.loadPage(0);
  const pix = page.toPixmap(mupdf.Matrix.scale(2, 2), mupdf.ColorSpace.DeviceRGB, false);
  const png = pix.asPNG();
  writeFileSync(new URL("./fixtures/page0.png", import.meta.url), png);
  return `png ${png.length}B (${pix.getWidth()}x${pix.getHeight()})`;
});

cap("extract-images", () => {
  const page = doc.loadPage(0);
  // Probe available image-enumeration API surface.
  const methods = ["getImages", "images"].filter((m) => typeof page[m] === "function");
  let count = 0;
  const st = page.toStructuredText("preserve-images");
  const parsed = JSON.parse(st.asJSON());
  const walk = (blocks) => (blocks || []).forEach((b) => { if (b.type === "image") count += 1; });
  walk(parsed.blocks);
  return `methods=[${methods.join(",")}], imageBlocks=${count}`;
});

cap("outlines", () => {
  const o = doc.loadOutline();
  return `outline=${o ? JSON.stringify(o).slice(0, 80) : "none"}`;
});

cap("pdfa-save", () => {
  const pdf = doc.asPDF ? doc.asPDF() : doc;
  const buf = pdf.saveToBuffer ? pdf.saveToBuffer("compress") : null;
  return buf ? `saved ${buf.asUint8Array().length}B (plain; PDF/A profile TBD)` : "no saveToBuffer";
});

console.log("\nSUMMARY", JSON.stringify(results, null, 2));
