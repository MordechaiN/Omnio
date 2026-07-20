/**
 * ICO container parsing — the format is a small directory header followed by
 * embedded images (either raw PNG or legacy BMP-DIB). Read-only, pure, and
 * unit-tested against handcrafted buffers.
 */
export interface IcoEntry {
  width: number;
  height: number;
  bitCount: number;
  /** Byte range of the embedded image within the source buffer. */
  offset: number;
  size: number;
  /** True when the entry is a PNG payload (modern icons); false for DIB/BMP. */
  isPng: boolean;
}

const PNG_MAGIC = [0x89, 0x50, 0x4e, 0x47];

export function parseIco(buffer: ArrayBuffer): IcoEntry[] | null {
  const view = new DataView(buffer);
  if (buffer.byteLength < 6) return null;
  if (view.getUint16(0, true) !== 0 || view.getUint16(2, true) !== 1) return null; // reserved=0, type=1 (icon)
  const count = view.getUint16(4, true);
  const entries: IcoEntry[] = [];

  for (let i = 0; i < count; i += 1) {
    const base = 6 + i * 16;
    if (base + 16 > buffer.byteLength) return null;
    const rawWidth = view.getUint8(base);
    const rawHeight = view.getUint8(base + 1);
    const bitCount = view.getUint16(base + 6, true);
    const size = view.getUint32(base + 8, true);
    const offset = view.getUint32(base + 12, true);
    if (offset + size > buffer.byteLength) return null;

    let isPng = false;
    if (size >= 4) {
      const bytes = new Uint8Array(buffer, offset, 4);
      isPng = PNG_MAGIC.every((byte, index) => bytes[index] === byte);
    }

    entries.push({
      // 0 in either dimension byte means 256px, per the ICO spec.
      width: rawWidth === 0 ? 256 : rawWidth,
      height: rawHeight === 0 ? 256 : rawHeight,
      bitCount,
      offset,
      size,
      isPng,
    });
  }
  return entries;
}

/** The bytes for one entry, ready to hand to a Blob. Only PNG entries are
 * directly usable as image sources without a BMP decoder. */
export function extractEntryBytes(buffer: ArrayBuffer, entry: IcoEntry): Uint8Array {
  return new Uint8Array(buffer, entry.offset, entry.size);
}
