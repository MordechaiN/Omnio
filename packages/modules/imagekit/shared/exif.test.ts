import { describe, expect, it } from "vitest";
import { parseExif } from "./exif.ts";

/** Build a minimal JPEG with one APP1/EXIF segment containing the given IFD entries. */
function buildJpeg(entries: Array<{ tag: number; type: number; count: number; value: number[] }>, tail: number[] = []): ArrayBuffer {
  // TIFF: big-endian ("MM"), magic 42, IFD at offset 8.
  const ifdCount = entries.length;
  const tiff: number[] = [
    0x4d, 0x4d, 0x00, 0x2a, 0x00, 0x00, 0x00, 0x08,
    (ifdCount >> 8) & 0xff, ifdCount & 0xff,
  ];
  for (const entry of entries) {
    tiff.push((entry.tag >> 8) & 0xff, entry.tag & 0xff);
    tiff.push((entry.type >> 8) & 0xff, entry.type & 0xff);
    tiff.push((entry.count >>> 24) & 0xff, (entry.count >>> 16) & 0xff, (entry.count >>> 8) & 0xff, entry.count & 0xff);
    const v = [...entry.value];
    while (v.length < 4) v.push(0);
    tiff.push(...v.slice(0, 4));
  }
  tiff.push(0, 0, 0, 0); // next IFD = none
  tiff.push(...tail);

  const exifHeader = [0x45, 0x78, 0x69, 0x66, 0x00, 0x00]; // "Exif\0\0"
  const segmentLength = 2 + exifHeader.length + tiff.length;
  const bytes = [
    0xff, 0xd8, // SOI
    0xff, 0xe1, (segmentLength >> 8) & 0xff, segmentLength & 0xff,
    ...exifHeader,
    ...tiff,
    0xff, 0xda, 0x00, 0x02, // SOS
  ];
  return new Uint8Array(bytes).buffer;
}

describe("parseExif", () => {
  it("returns null for non-JPEG input", () => {
    expect(parseExif(new Uint8Array([0x89, 0x50, 0x4e, 0x47]).buffer)).toBeNull();
  });

  it("returns null for a JPEG without EXIF", () => {
    const plain = new Uint8Array([0xff, 0xd8, 0xff, 0xda, 0x00, 0x02]).buffer;
    expect(parseExif(plain)).toBeNull();
  });

  it("reads orientation and detects GPS", () => {
    const summary = parseExif(
      buildJpeg([
        { tag: 0x0112, type: 3, count: 1, value: [0x00, 0x06, 0x00, 0x00] }, // orientation 6
        { tag: 0x8825, type: 4, count: 1, value: [0x00, 0x00, 0x00, 0x00] }, // GPS IFD pointer
      ]),
    );
    expect(summary).not.toBeNull();
    expect(summary!.orientation).toBe(6);
    expect(summary!.hasGps).toBe(true);
  });

  it("reads a short inline ASCII make", () => {
    const summary = parseExif(
      buildJpeg([{ tag: 0x010f, type: 2, count: 4, value: [0x41, 0x42, 0x43, 0x00] }]), // "ABC"
    );
    expect(summary!.make).toBe("ABC");
    expect(summary!.hasGps).toBe(false);
  });

  it("ignores GPS-free files gracefully", () => {
    const summary = parseExif(
      buildJpeg([{ tag: 0x0112, type: 3, count: 1, value: [0x00, 0x01, 0x00, 0x00] }]),
    );
    expect(summary!.hasGps).toBe(false);
    expect(summary!.orientation).toBe(1);
  });
});
