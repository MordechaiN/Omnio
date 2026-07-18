import type { Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "./fixtures";

/** Seed the local usage-stats store before the app's first script runs. */
async function seedUsage(page: Page, entries: Record<string, { count: number; lastUsedAt: number }>) {
  const value = JSON.stringify({ v: 1, tools: entries });
  await page.addInitScript((v) => window.localStorage.setItem("omnio.usage.v1", v), value);
}

test.describe("stats", () => {
  test("shows an empty state with no recorded usage", async ({ page }) => {
    await page.goto("/stats");
    await expect(page.getByText("No stats yet")).toBeVisible();
    await expect(page.getByRole("link", { name: "Browse tools" })).toBeVisible();
  });

  test("shows aggregated counts, popular and by-category — never a per-run list", async ({
    page,
  }) => {
    const now = Date.now();
    await seedUsage(page, {
      "case.uppercase": { count: 5, lastUsedAt: now },
      "base64.base64": { count: 2, lastUsedAt: now - 30 * 24 * 60 * 60 * 1000 }, // over a month ago
    });

    await page.goto("/stats");

    await expect(page.getByRole("heading", { name: "Usage stats" })).toBeVisible();
    // Aggregate totals, not a list of individual runs.
    await expect(page.getByText("7", { exact: true })).toBeVisible(); // total runs
    await expect(page.getByText("2", { exact: true }).first()).toBeVisible(); // distinct tools used

    // Appears in both "Most used" and "Trending" — both rows are expected.
    await expect(page.getByRole("link", { name: /Uppercase/i }).first()).toBeVisible();

    // Nothing that looks like a per-run audit log (timestamps, download links, statuses).
    await expect(page.getByRole("link", { name: /^Download$/i })).toHaveCount(0);

    const results = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa"]).analyze();
    const serious = results.violations.filter(
      (v) => v.impact === "serious" || v.impact === "critical",
    );
    expect(serious, serious.map((v) => v.id).join("\n")).toEqual([]);
  });

  test("clearing stats returns to the empty state", async ({ page }) => {
    await seedUsage(page, { "case.uppercase": { count: 3, lastUsedAt: Date.now() } });
    await page.goto("/stats");

    await page.getByRole("button", { name: "Clear stats" }).click();
    await page.getByRole("button", { name: "Clear stats" }).last().click();

    await expect(page.getByText("No stats yet")).toBeVisible();
  });

  test("the sidebar links to Stats, not History", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("link", { name: "Stats" })).toBeVisible();
    await expect(page.getByRole("link", { name: "History" })).toHaveCount(0);
    await expect(page.locator('[href="/history"]')).toHaveCount(0);
  });
});
