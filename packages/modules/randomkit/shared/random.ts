/**
 * Random integer generator — on-device, cryptographically strong.
 *
 * Values come from crypto.getRandomValues with rejection sampling, so the
 * distribution over [min, max] is uniform (no modulo bias). Unique mode draws
 * without replacement; it errors if you ask for more distinct values than the
 * range can hold.
 */

export interface RandomOptions {
  min: number;
  max: number;
  count: number;
  unique: boolean;
}

export interface RandomResult {
  ok: boolean;
  values?: number[];
  error?: string;
}

/** Uniform integer in [min, max] inclusive, no modulo bias. */
export function randomInt(min: number, max: number): number {
  const range = max - min + 1;
  if (range <= 0) throw new RangeError("max must be ≥ min");
  const maxUint = 0xffffffff;
  const limit = maxUint - ((maxUint + 1) % range);
  const buffer = new Uint32Array(1);
  let value: number;
  do {
    crypto.getRandomValues(buffer);
    value = buffer[0]!;
  } while (value > limit);
  return min + (value % range);
}

export function generateNumbers(options: RandomOptions): RandomResult {
  const { min, max, count, unique } = options;
  if (!Number.isInteger(min) || !Number.isInteger(max)) {
    return { ok: false, error: "Bounds must be whole numbers." };
  }
  if (max < min) return { ok: false, error: "Maximum must be at least the minimum." };
  if (count < 1 || count > 1000) return { ok: false, error: "Count must be between 1 and 1000." };

  const range = max - min + 1;
  if (unique && count > range) {
    return { ok: false, error: `Only ${range} distinct values exist in this range.` };
  }

  if (unique) {
    // Partial Fisher–Yates over a virtual [min..max] pool.
    const pool = new Map<number, number>();
    const result: number[] = [];
    for (let i = 0; i < count; i += 1) {
      const j = randomInt(i, range - 1);
      const vi = pool.get(i) ?? i;
      const vj = pool.get(j) ?? j;
      pool.set(j, vi);
      pool.set(i, vj);
      result.push(min + vj);
    }
    return { ok: true, values: result };
  }

  const values = Array.from({ length: count }, () => randomInt(min, max));
  return { ok: true, values };
}
