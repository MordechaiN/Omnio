/**
 * Compound-interest projection with an optional recurring monthly
 * contribution. Interest compounds monthly at (annual rate / 12);
 * contributions are added at the end of each month, so the first
 * contribution earns interest from month two onward.
 */

export interface InterestInput {
  /** Starting balance. */
  principal: number;
  /** Contribution added at the end of every month. */
  monthlyContribution: number;
  /** Annual interest rate in percent (e.g. 5 for 5%). */
  annualRatePercent: number;
  /** Investment horizon in whole years. */
  years: number;
}

export interface YearRow {
  year: number;
  /** Balance at the end of the year. */
  balance: number;
  /** Everything paid in so far (principal + contributions). */
  contributed: number;
  /** Interest accumulated so far. */
  interest: number;
}

export interface InterestResult {
  finalBalance: number;
  totalContributed: number;
  totalInterest: number;
  rows: YearRow[];
}

export function projectGrowth(input: InterestInput): InterestResult {
  const { principal, monthlyContribution, annualRatePercent, years } = input;
  const monthlyRate = annualRatePercent / 100 / 12;

  let balance = principal;
  let contributed = principal;
  const rows: YearRow[] = [];

  for (let year = 1; year <= years; year += 1) {
    for (let month = 0; month < 12; month += 1) {
      balance += balance * monthlyRate;
      balance += monthlyContribution;
      contributed += monthlyContribution;
    }
    rows.push({
      year,
      balance,
      contributed,
      interest: balance - contributed,
    });
  }

  return {
    finalBalance: balance,
    totalContributed: contributed,
    totalInterest: balance - contributed,
    rows,
  };
}

export function isValidInput(input: InterestInput): boolean {
  return (
    Number.isFinite(input.principal) &&
    input.principal >= 0 &&
    Number.isFinite(input.monthlyContribution) &&
    input.monthlyContribution >= 0 &&
    Number.isFinite(input.annualRatePercent) &&
    input.annualRatePercent >= 0 &&
    input.annualRatePercent <= 100 &&
    Number.isInteger(input.years) &&
    input.years >= 1 &&
    input.years <= 100
  );
}
