// Generate a real multi-page PDF fixture for the engine spikes.
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import { writeFileSync } from "node:fs";

const doc = await PDFDocument.create();
doc.setTitle("Spike Fixture");
const font = await doc.embedFont(StandardFonts.Helvetica);
const lines = [
  "Invoice 2026-07-22",
  "The quick brown fox jumps over the lazy dog.",
  "Total due: 1,234.56 USD",
];
for (let p = 0; p < 3; p += 1) {
  const page = doc.addPage([612, 792]);
  lines.forEach((text, i) => {
    page.drawText(`Page ${p + 1}: ${text}`, {
      x: 48,
      y: 720 - i * 28,
      size: 18,
      font,
      color: rgb(0, 0, 0),
    });
  });
}
const bytes = await doc.save();
writeFileSync(new URL("./fixtures/sample.pdf", import.meta.url), bytes);
console.log("wrote fixtures/sample.pdf", bytes.length, "bytes");
