/**
 * Unit converter — on-device, factor-based.
 *
 * Linear categories (length, mass, volume) store each unit's ratio to a base
 * unit, so conversion is a single multiply/divide. Temperature is affine, not
 * linear, so it gets its own explicit conversion through Celsius.
 */

export type Category = "length" | "mass" | "volume" | "temperature";

export const FACTORS: Record<Exclude<Category, "temperature">, Record<string, number>> = {
  length: { m: 1, km: 1000, cm: 0.01, mm: 0.001, mi: 1609.344, yd: 0.9144, ft: 0.3048, in: 0.0254 },
  mass: { kg: 1, g: 0.001, mg: 1e-6, lb: 0.45359237, oz: 0.028349523125, t: 1000 },
  volume: {
    l: 1,
    ml: 0.001,
    m3: 1000,
    gal: 3.785411784,
    qt: 0.946352946,
    cup: 0.2365882365,
    floz: 0.0295735295625,
  },
};

export const TEMPERATURE_UNITS = ["c", "f", "k"] as const;

export function unitsFor(category: Category): string[] {
  return category === "temperature" ? [...TEMPERATURE_UNITS] : Object.keys(FACTORS[category]);
}

function toCelsius(value: number, from: string): number {
  if (from === "c") return value;
  if (from === "f") return ((value - 32) * 5) / 9;
  return value - 273.15; // kelvin
}

function fromCelsius(value: number, to: string): number {
  if (to === "c") return value;
  if (to === "f") return (value * 9) / 5 + 32;
  return value + 273.15;
}

export function convert(category: Category, from: string, to: string, value: number): number {
  if (category === "temperature") {
    return fromCelsius(toCelsius(value, from), to);
  }
  const factors = FACTORS[category];
  const fromFactor = factors[from];
  const toFactor = factors[to];
  if (fromFactor === undefined || toFactor === undefined) {
    throw new Error(`Unknown unit for ${category}`);
  }
  return (value * fromFactor) / toFactor;
}
