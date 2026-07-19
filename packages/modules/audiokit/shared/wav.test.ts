import { describe, expect, it } from "vitest";
import { clampTrimRange, encodeWav } from "./wav.ts";

describe("clampTrimRange", () => {
  it("clamps into [0, duration] and keeps start ≤ end", () => {
    expect(clampTrimRange(-1, 5, 10)).toEqual({ start: 0, end: 5 });
    expect(clampTrimRange(3, 99, 10)).toEqual({ start: 3, end: 10 });
    expect(clampTrimRange(7, 2, 10)).toEqual({ start: 7, end: 7 });
  });
});

describe("encodeWav", () => {
  it("writes a valid header for stereo audio", () => {
    const channels = [new Float32Array([0, 0.5, -0.5]), new Float32Array([1, -1, 0])];
    const buffer = encodeWav({ channels, sampleRate: 48000 });
    const view = new DataView(buffer);
    const ascii = (offset: number, length: number) =>
      String.fromCharCode(...new Uint8Array(buffer, offset, length));

    expect(ascii(0, 4)).toBe("RIFF");
    expect(ascii(8, 4)).toBe("WAVE");
    expect(view.getUint16(22, true)).toBe(2); // channels
    expect(view.getUint32(24, true)).toBe(48000); // sample rate
    expect(view.getUint32(40, true)).toBe(3 * 2 * 2); // data size = frames×ch×2
    expect(buffer.byteLength).toBe(44 + 12);
  });

  it("interleaves and clamps samples", () => {
    const buffer = encodeWav({
      channels: [new Float32Array([2]), new Float32Array([-2])],
      sampleRate: 8000,
    });
    const view = new DataView(buffer);
    expect(view.getInt16(44, true)).toBe(0x7fff); // clamped +1 → left first
    expect(view.getInt16(46, true)).toBe(-0x8000); // clamped −1 → right second
  });

  it("handles mono and empty input", () => {
    expect(encodeWav({ channels: [new Float32Array(0)], sampleRate: 44100 }).byteLength).toBe(44);
  });
});
