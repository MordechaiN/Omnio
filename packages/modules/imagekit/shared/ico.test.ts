import { describe, expect, it } from "vitest";
import { extractEntryBytes, parseIco } from "./ico.ts";

function buildIco(images: Array<{ w: number; h: number; bits: number; data: number[] }>): ArrayBuffer {
  const header = [0, 0, 1, 0, images.length & 0xff, (images.length >> 8) & 0xff];
  const dirEntries: number[] = [];
  const payloads: number[] = [];
  let offset = 6 + images.length * 16;
  for (const img of images) {
    dirEntries.push(
      img.w === 256 ? 0 : img.w,
      img.h === 256 ? 0 : img.h,
      0, 0, // color count, reserved
      1, 0, // planes
      img.bits & 0xff, (img.bits >> 8) & 0xff,
      img.data.length & 0xff, (img.data.length >> 8) & 0xff, 0, 0,
      offset & 0xff, (offset >> 8) & 0xff, (offset >> 16) & 0xff, (offset >> 24) & 0xff,
    );
    payloads.push(...img.data);
    offset += img.data.length;
  }
  return new Uint8Array([...header, ...dirEntries, ...payloads]).buffer;
}

const PNG_HEADER = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];

describe("parseIco", () => {
  it("parses a single PNG-payload entry", () => {
    const buffer = buildIco([{ w: 32, h: 32, bits: 32, data: [...PNG_HEADER, 1, 2, 3, 4] }]);
    const entries = parseIco(buffer);
    expect(entries).toHaveLength(1);
    expect(entries![0]).toMatchObject({ width: 32, height: 32, bitCount: 32, isPng: true });
  });

  it("maps a 0-byte dimension to 256px", () => {
    const buffer = buildIco([{ w: 256, h: 256, bits: 32, data: PNG_HEADER }]);
    expect(parseIco(buffer)![0]).toMatchObject({ width: 256, height: 256 });
  });

  it("detects a non-PNG (legacy BMP/DIB) entry", () => {
    const buffer = buildIco([{ w: 16, h: 16, bits: 24, data: [0x28, 0, 0, 0, 1, 2, 3, 4] }]);
    expect(parseIco(buffer)![0]!.isPng).toBe(false);
  });

  it("parses multiple entries in order", () => {
    const buffer = buildIco([
      { w: 16, h: 16, bits: 32, data: PNG_HEADER },
      { w: 48, h: 48, bits: 32, data: [...PNG_HEADER, 9] },
    ]);
    const entries = parseIco(buffer)!;
    expect(entries.map((e) => e.width)).toEqual([16, 48]);
  });

  it("rejects a non-ICO buffer and truncated data", () => {
    expect(parseIco(new Uint8Array([1, 2, 3, 4, 5, 6]).buffer)).toBeNull();
    expect(parseIco(new Uint8Array([0, 0, 1, 0, 1, 0]).buffer)).toBeNull(); // claims 1 entry, no directory
  });
});

describe("extractEntryBytes", () => {
  it("slices exactly the entry's payload", () => {
    const buffer = buildIco([{ w: 16, h: 16, bits: 32, data: [...PNG_HEADER, 0xaa, 0xbb] }]);
    const entry = parseIco(buffer)![0]!;
    const bytes = extractEntryBytes(buffer, entry);
    expect(bytes.length).toBe(entry.size);
    expect(bytes.at(-1)).toBe(0xbb);
  });
});
