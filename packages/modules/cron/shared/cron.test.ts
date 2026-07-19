import { describe, expect, it } from "vitest";
import { CronParseError, nextRuns, parseCron, summarizeField } from "./cron.ts";

describe("parseCron", () => {
  it("parses a wildcard expression", () => {
    const cron = parseCron("* * * * *");
    expect(cron.minute.wildcard).toBe(true);
    expect(cron.minute.values.size).toBe(60);
    expect(cron.dayOfWeek.values.size).toBe(7);
  });

  it("parses lists, ranges, and steps", () => {
    const cron = parseCron("0,30 9-17 */2 1,6 mon-fri");
    expect([...cron.minute.values]).toEqual([0, 30]);
    expect(cron.hour.values.size).toBe(9);
    expect(cron.dayOfMonth.values.has(1)).toBe(true);
    expect(cron.dayOfMonth.values.has(2)).toBe(false);
    expect([...cron.month.values]).toEqual([1, 6]);
    expect([...cron.dayOfWeek.values].sort()).toEqual([1, 2, 3, 4, 5]);
  });

  it("accepts month and weekday names case-insensitively", () => {
    const cron = parseCron("0 0 * JAN,dec Sun");
    expect([...cron.month.values]).toEqual([1, 12]);
    expect([...cron.dayOfWeek.values]).toEqual([0]);
  });

  it("normalizes day-of-week 7 to Sunday", () => {
    const cron = parseCron("0 0 * * 7");
    expect([...cron.dayOfWeek.values]).toEqual([0]);
    expect(cron.dayOfWeek.wildcard).toBe(false);
  });

  it("expands @-macros", () => {
    const cron = parseCron("@daily");
    expect([...cron.minute.values]).toEqual([0]);
    expect([...cron.hour.values]).toEqual([0]);
    expect(cron.dayOfMonth.wildcard).toBe(true);
  });

  it("treats N/step as N-to-max with step", () => {
    const cron = parseCron("5/15 * * * *");
    expect([...cron.minute.values]).toEqual([5, 20, 35, 50]);
  });

  it("rejects malformed expressions", () => {
    expect(() => parseCron("* * * *")).toThrow(CronParseError);
    expect(() => parseCron("60 * * * *")).toThrow(CronParseError);
    expect(() => parseCron("* * 0 * *")).toThrow(CronParseError);
    expect(() => parseCron("*/0 * * * *")).toThrow(CronParseError);
    expect(() => parseCron("1-60 * * * *")).toThrow(CronParseError);
    expect(() => parseCron("a * * * *")).toThrow(CronParseError);
    expect(() => parseCron("5-1 * * * *")).toThrow(CronParseError);
  });
});

describe("nextRuns", () => {
  const from = new Date(2026, 0, 1, 12, 0, 0); // Thu Jan 1 2026, 12:00 local

  it("finds the next runs of an every-15-minutes schedule", () => {
    const runs = nextRuns(parseCron("*/15 * * * *"), from, 3);
    expect(runs.map((d) => d.getMinutes())).toEqual([15, 30, 45]);
    expect(runs[0]!.getHours()).toBe(12);
  });

  it("is strictly after the reference time", () => {
    const runs = nextRuns(parseCron("0 12 * * *"), from, 1);
    expect(runs[0]!.getDate()).toBe(2);
  });

  it("honors day-of-week restrictions", () => {
    const runs = nextRuns(parseCron("0 9 * * mon"), from, 2);
    for (const run of runs) {
      expect(run.getDay()).toBe(1);
      expect(run.getHours()).toBe(9);
    }
    expect(runs[0]!.getDate()).toBe(5); // first Monday after Jan 1 2026
  });

  it("uses OR semantics when both day fields are restricted", () => {
    // "the 1st of the month, or any Monday"
    const runs = nextRuns(parseCron("0 0 1 * mon"), from, 4);
    const days = runs.map((d) => `${d.getDate()}/${d.getDay()}`);
    expect(days).toEqual(["5/1", "12/1", "19/1", "26/1"]);
  });

  it("finds Feb 29 across the year boundary", () => {
    const runs = nextRuns(parseCron("0 0 29 2 *"), from, 1);
    expect(runs).toHaveLength(1);
    expect(runs[0]!.getFullYear()).toBe(2028);
  });

  it("returns an empty list for an impossible date", () => {
    expect(nextRuns(parseCron("0 0 31 2 *"), from, 1)).toEqual([]);
  });
});

describe("summarizeField", () => {
  it("reports wildcards as 'every'", () => {
    expect(summarizeField(parseCron("* * * * *").minute)).toEqual({ kind: "every", values: [] });
  });

  it("reports restricted fields with sorted values", () => {
    expect(summarizeField(parseCron("30,0 * * * *").minute)).toEqual({
      kind: "values",
      values: [0, 30],
    });
  });
});
