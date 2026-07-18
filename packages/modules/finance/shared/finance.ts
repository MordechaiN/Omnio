/**
 * Everyday money math — on-device.
 *
 * Loan uses the standard amortization formula; a zero-interest loan degrades to
 * simple division. VAT can be added to a net price or extracted from a gross
 * one. Percentage and tip helpers round only at the presentation boundary, so
 * intermediate precision is preserved.
 */

export function round2(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

export interface LoanResult {
  monthlyPayment: number;
  totalPaid: number;
  totalInterest: number;
}

export function loanPayment(principal: number, annualRatePct: number, years: number): LoanResult {
  const months = Math.round(years * 12);
  if (months <= 0 || principal <= 0) {
    return { monthlyPayment: 0, totalPaid: 0, totalInterest: 0 };
  }
  const monthlyRate = annualRatePct / 100 / 12;
  const payment =
    monthlyRate === 0
      ? principal / months
      : (principal * monthlyRate) / (1 - (1 + monthlyRate) ** -months);
  const totalPaid = payment * months;
  return {
    monthlyPayment: round2(payment),
    totalPaid: round2(totalPaid),
    totalInterest: round2(totalPaid - principal),
  };
}

export interface VatResult {
  net: number;
  vat: number;
  gross: number;
}

export function vat(amount: number, ratePct: number, mode: "add" | "extract"): VatResult {
  const rate = ratePct / 100;
  if (mode === "add") {
    const tax = amount * rate;
    return { net: round2(amount), vat: round2(tax), gross: round2(amount + tax) };
  }
  const net = amount / (1 + rate);
  return { net: round2(net), vat: round2(amount - net), gross: round2(amount) };
}

/** part is what % of whole. */
export function percentOf(part: number, whole: number): number {
  if (whole === 0) return 0;
  return round2((part / whole) * 100);
}

/** Percentage change from → to (negative = decrease). */
export function percentChange(from: number, to: number): number {
  if (from === 0) return 0;
  return round2(((to - from) / Math.abs(from)) * 100);
}

export interface TipResult {
  tip: number;
  total: number;
  perPerson: number;
}

export function tip(bill: number, tipPct: number, people: number): TipResult {
  const split = Math.max(1, Math.round(people));
  const tipAmount = bill * (tipPct / 100);
  const total = bill + tipAmount;
  return { tip: round2(tipAmount), total: round2(total), perPerson: round2(total / split) };
}
