/**
 * Facts about an audio file that can be had without decoding it.
 *
 * Duration comes from the browser's own media element, which reads the header
 * and stops. Everything below is arithmetic on top of that, so a two-hour
 * recording is described as fast as a ringtone and nothing is ever held in
 * memory. Decoding to answer "how long is this?" would be the audio equivalent
 * of unpacking an archive to count its files.
 */

/**
 * Average bitrate across the whole file, in kbps.
 *
 * "Average" is the honest word: a variable-bitrate file has no single bitrate,
 * and this is total size divided by total time rather than anything read from a
 * header. Null when there is nothing sensible to divide.
 */
export function averageBitrateKbps(bytes: number, seconds: number): number | null {
  if (!Number.isFinite(seconds) || seconds <= 0 || bytes <= 0) return null;
  return Math.round((bytes * 8) / seconds / 1000);
}

/** `1:04:09` for anything over an hour, `4:09` otherwise. */
export function formatDuration(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) return "—";
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  return h > 0
    ? `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`
    : `${m}:${String(s).padStart(2, "0")}`;
}

/**
 * How much room the same recording would take uncompressed, at CD quality.
 *
 * This is what makes the number mean something: "40 MB" is abstract, "a tenth
 * of what it would be uncompressed" is not.
 */
export function uncompressedBytes(seconds: number): number {
  if (!Number.isFinite(seconds) || seconds <= 0) return 0;
  const CD_BYTES_PER_SECOND = 44_100 * 2 * 2; // 44.1 kHz, 16-bit, stereo
  return Math.round(seconds * CD_BYTES_PER_SECOND);
}
