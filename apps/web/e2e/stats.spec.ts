import AxeBuilder from "@axe-core/playwright";
import { expect, mockJson, test } from "./fixtures";

const STATS_URL = "**/api/v1/analytics/stats";

test.describe("stats", () => {
  test("shows general platform facts even when analytics is off", async ({ page }) => {
    await mockJson(page, STATS_URL, 200, { enabled: false, totalEvents: 0, byTool: [], trending: [] });

    await page.goto("/stats");

    await expect(page.getByRole("heading", { name: "Statistics" })).toBeVisible();
    await expect(page.getByText("Available tools")).toBeVisible();
    await expect(page.getByText("Usage analytics are off")).toBeVisible();
    // The general facts are always present, even with analytics off.
    await expect(page.getByText("Categories", { exact: true }).first()).toBeVisible();
    // Never a personal history list — no timestamps, no per-run download links.
    await expect(page.getByRole("link", { name: /^Download$/i })).toHaveCount(0);

    const results = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa"]).analyze();
    const serious = results.violations.filter(
      (v) => v.impact === "serious" || v.impact === "critical",
    );
    expect(serious, serious.map((v) => v.id).join("\n")).toEqual([]);
  });

  test("shows anonymous aggregate usage when analytics is on", async ({ page }) => {
    await mockJson(page, STATS_URL, 200, {
      enabled: true,
      totalEvents: 12,
      byTool: [
        { toolId: "case.uppercase", count: 7 },
        { toolId: "base64.base64", count: 5 },
      ],
      trending: [{ toolId: "case.uppercase", count: 7 }],
    });

    await page.goto("/stats");

    await expect(page.getByText("Most used tools")).toBeVisible();
    await expect(page.getByText(/Uppercase/i).first()).toBeVisible();
    await expect(page.getByText("Trending this week")).toBeVisible();
    // Aggregate totals only, never a per-run breakdown.
    await expect(page.getByRole("link", { name: /^Download$/i })).toHaveCount(0);
  });

  test("the sidebar links to Stats, not History", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("link", { name: "Stats" })).toBeVisible();
    await expect(page.getByRole("link", { name: "History" })).toHaveCount(0);
    await expect(page.locator('[href="/history"]')).toHaveCount(0);
  });
});
