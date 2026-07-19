/**
 * Minimal JPEG EXIF reader — walks the APP1 segment's TIFF structure and
 * returns the tags people actually care about before sharing a photo: camera
 * make/model, capture time, orientation, and whether GPS data is present.
 * Read-only and dependency-free; unknown or non-JPEG input yields null.
 */

export interface ExifSummary {
  make?: string;
  model?: string;
  dateTime?: string;
  orientation?: number;
  software?: string;
  hasGps: boolean;
}

const TAGS = {
  make: 0x010f,
  model: 0x0110,
  orientation: 0x0112,
  software: 0x0131,
  dateTime: 0x0132,
  gpsPointer: 0x8825,
} as const;

function readAscii(view: DataView, offset: number, length: number): string {
  let out = "";
  for (let i = 0; i < length; i += 1) {
    const code = view.getUint8(offset + i);
    if (code === 0) break;
    out += String.fromCharCode(code);
  }
  return out.trim();
}

/** Parse the EXIF summary out of JPEG bytes; null when there is no EXIF. */
export function parseExif(bytes: ArrayBuffer): ExifSummary | null {
  const view = new DataView(bytes);
  if (view.byteLength < 4 || view.getUint16(0) !== 0xffd8) return null; // not JPEG

  // Walk JPEG segments looking for APP1/Exif.
  let offset = 2;
  while (offset + 4 <= view.byteLength) {
    if (view.getUint8(offset) !== 0xff) return null;
    const marker = view.getUint8(offset + 1);
    if (marker === 0xda) return null; // start of scan — no EXIF found
    const size = view.getUint16(offset + 2);
    if (marker === 0xe1 && offset + 10 <= view.byteLength) {
      const isExif =
        view.getUint32(offset + 4) === 0x45786966 && view.getUint16(offset + 8) === 0x0000;
      if (isExif) return parseTiff(view, offset + 10, size - 8);
    }
    offset += 2 + size;
  }
  return null;
}

function parseTiff(view: DataView, tiffStart: number, tiffLength: number): ExifSummary | null {
  if (tiffStart + 8 > view.byteLength) return null;
  const byteOrder = view.getUint16(tiffStart);
  const little = byteOrder === 0x4949;
  if (!little && byteOrder !== 0x4d4d) return null;

  const u16 = (o: number) => view.getUint16(o, little);
  const u32 = (o: number) => view.getUint32(o, little);
  if (u16(tiffStart + 2) !== 42) return null;

  const ifdOffset = u32(tiffStart + 4);
  const ifd = tiffStart + ifdOffset;
  if (ifd + 2 > view.byteLength) return null;

  const summary: ExifSummary = { hasGps: false };
  const count = u16(ifd);
  for (let i = 0; i < count; i += 1) {
    const entry = ifd + 2 + i * 12;
    if (entry + 12 > view.byteLength || entry + 12 > tiffStart + tiffLength) break;
    const tag = u16(entry);
    const type = u16(entry + 2);
    const length = u32(entry + 4);

    if (tag === TAGS.gpsPointer) {
      summary.hasGps = true;
      continue;
    }
    if (tag === TAGS.orientation && type === 3) {
      summary.orientation = u16(entry + 8);
      continue;
    }
    const isAscii = type === 2;
    if (!isAscii) continue;
    // ASCII values ≤4 bytes are inline; longer ones are stored at an offset.
    const valueOffset = length <= 4 ? entry + 8 : tiffStart + u32(entry + 8);
    if (valueOffset + length > view.byteLength) continue;
    const text = readAscii(view, valueOffset, length);
    if (tag === TAGS.make) summary.make = text;
    else if (tag === TAGS.model) summary.model = text;
    else if (tag === TAGS.software) summary.software = text;
    else if (tag === TAGS.dateTime) summary.dateTime = text;
  }

  const hasAnything =
    summary.hasGps ||
    summary.make !== undefined ||
    summary.model !== undefined ||
    summary.dateTime !== undefined ||
    summary.software !== undefined ||
    summary.orientation !== undefined;
  return hasAnything ? summary : null;
}
