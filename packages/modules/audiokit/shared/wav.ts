/**
 * Minimal 16-bit PCM WAV encoder for Web Audio buffers — pure and testable.
 * Interleaves channels, clamps samples, and writes a canonical 44-byte header.
 */

export interface PcmInput {
  /** One Float32Array per channel, all the same length, samples in [-1, 1]. */
  channels: Float32Array[];
  sampleRate: number;
}

export function clampTrimRange(
  start: number,
  end: number,
  duration: number,
): { start: number; end: number } {
  const s = Math.min(Math.max(0, start), duration);
  const e = Math.min(Math.max(s, end), duration);
  return { start: s, end: e };
}

export function encodeWav({ channels, sampleRate }: PcmInput): ArrayBuffer {
  const channelCount = channels.length;
  const frames = channels[0]?.length ?? 0;
  const bytesPerSample = 2;
  const blockAlign = channelCount * bytesPerSample;
  const dataSize = frames * blockAlign;
  const buffer = new ArrayBuffer(44 + dataSize);
  const view = new DataView(buffer);

  const writeAscii = (offset: number, text: string) => {
    for (let i = 0; i < text.length; i += 1) view.setUint8(offset + i, text.charCodeAt(i));
  };

  writeAscii(0, "RIFF");
  view.setUint32(4, 36 + dataSize, true);
  writeAscii(8, "WAVE");
  writeAscii(12, "fmt ");
  view.setUint32(16, 16, true); // fmt chunk size
  view.setUint16(20, 1, true); // PCM
  view.setUint16(22, channelCount, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * blockAlign, true);
  view.setUint16(32, blockAlign, true);
  view.setUint16(34, 16, true); // bits per sample
  writeAscii(36, "data");
  view.setUint32(40, dataSize, true);

  let offset = 44;
  for (let frame = 0; frame < frames; frame += 1) {
    for (let channel = 0; channel < channelCount; channel += 1) {
      const sample = Math.max(-1, Math.min(1, channels[channel]![frame]!));
      view.setInt16(offset, sample < 0 ? sample * 0x8000 : sample * 0x7fff, true);
      offset += 2;
    }
  }
  return buffer;
}
