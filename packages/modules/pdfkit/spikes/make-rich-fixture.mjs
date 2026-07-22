// Fixture with an embedded image AND a bookmark outline, to probe mupdf
// extract-images and outline reading on real content.
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import { readFileSync, writeFileSync } from "node:fs";

const doc = await PDFDocument.create();
const font = await doc.embedFont(StandardFonts.Helvetica);
const png = await doc.embedPng(readFileSync(new URL("./fixtures/page0.png", import.meta.url)));
for (let p = 0; p < 2; p += 1) {
  const page = doc.addPage([612, 792]);
  page.drawText(`Chapter ${p + 1}`, { x: 48, y: 740, size: 24, font, color: rgb(0, 0, 0) });
  page.drawImage(png, { x: 48, y: 300, width: 200, height: 260 });
}
const bytes = await doc.save();
writeFileSync(new URL("./fixtures/rich.pdf", import.meta.url), bytes);
console.log("wrote rich.pdf", bytes.length, "bytes (2 pages, 1 image each)");
