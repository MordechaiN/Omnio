// Spike: OCR a rasterized page and confirm we get (a) legible text and
// (b) per-word bounding boxes + confidence — required to place an invisible
// text layer for a searchable PDF (Phase 3).
import { createWorker } from "tesseract.js";
import { readFileSync } from "node:fs";

const img = readFileSync(new URL("./fixtures/page0.png", import.meta.url));
const worker = await createWorker("eng");
const { data } = await worker.recognize(img, {}, { text: true, blocks: true });
console.log("confidence:", data.confidence);
console.log("text sample:", JSON.stringify(data.text.slice(0, 120)));

let words = [];
for (const block of data.blocks || []) {
  for (const para of block.paragraphs || []) {
    for (const line of para.lines || []) {
      words = words.concat(line.words || []);
    }
  }
}
console.log("word count:", words.length);
if (words[0]) {
  console.log("first word:", JSON.stringify({ text: words[0].text, bbox: words[0].bbox, conf: words[0].confidence }));
}
console.log("all-words have bbox:", words.every((w) => w.bbox && typeof w.bbox.x0 === "number"));
await worker.terminate();
