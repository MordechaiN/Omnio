/**
 * Body-mass-index calculator — on-device.
 *
 * BMI = weight(kg) / height(m)². Categories follow the WHO adult cut-offs.
 * Imperial inputs are converted to metric first so there is a single code
 * path for the actual computation.
 */

export type BmiCategory = "underweight" | "normal" | "overweight" | "obese";

export interface BmiResult {
  ok: boolean;
  bmi?: number;
  category?: BmiCategory;
  error?: string;
}

export function categorize(bmi: number): BmiCategory {
  if (bmi < 18.5) return "underweight";
  if (bmi < 25) return "normal";
  if (bmi < 30) return "overweight";
  return "obese";
}

export function bmiMetric(weightKg: number, heightCm: number): BmiResult {
  if (!(weightKg > 0) || !(heightCm > 0)) {
    return { ok: false, error: "Enter a positive weight and height." };
  }
  const meters = heightCm / 100;
  const bmi = weightKg / (meters * meters);
  return { ok: true, bmi: Math.round(bmi * 10) / 10, category: categorize(bmi) };
}

export function lbToKg(lb: number): number {
  return lb * 0.45359237;
}

export function inToCm(inches: number): number {
  return inches * 2.54;
}

export function bmiImperial(weightLb: number, heightIn: number): BmiResult {
  if (!(weightLb > 0) || !(heightIn > 0)) {
    return { ok: false, error: "Enter a positive weight and height." };
  }
  return bmiMetric(lbToKg(weightLb), inToCm(heightIn));
}
