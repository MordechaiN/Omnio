import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "./fixtures";

/**
 * WCAG AA gate for the shell surfaces, in both directions and themes.
 * Tools get their own axe coverage as they land (M7+).
 */

const PAGES = [
  { name: "home en", path: "/" },
  { name: "home he", path: "/he" },
  { name: "settings en", path: "/settings" },
  { name: "category en", path: "/t/pdf" },
] as const;

for (const { name, path } of PAGES) {
  test(`${name} has no serious accessibility violations`, async ({ page }) => {
    await page.goto(path);
    const results = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
      .analyze();
    const serious = results.violations.filter(
      (v) => v.impact === "serious" || v.impact === "critical",
    );
    expect(
      serious,
      serious.map((v) => `${v.id}: ${v.help} (${v.nodes.length} nodes)`).join("\n"),
    ).toEqual([]);
  });
}

test("dark theme home passes axe", async ({ page }) => {
  await page.emulateMedia({ colorScheme: "dark" });
  await page.goto("/");
  const results = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa"]).analyze();
  const serious = results.violations.filter(
    (v) => v.impact === "serious" || v.impact === "critical",
  );
  expect(serious).toEqual([]);
});
