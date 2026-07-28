import AxeBuilder from "@axe-core/playwright";
import { PDFDocument } from "pdf-lib";
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
    // Let the entrance animation (staggered up to ~480ms) settle before
    // scanning — mid-animation frames are a real transient, not a fixed
    // violation, and axe otherwise catches them nondeterministically.
    await page.waitForTimeout(500);
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
  await page.waitForTimeout(500);
  const results = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa"]).analyze();
  const serious = results.violations.filter(
    (v) => v.impact === "serious" || v.impact === "critical",
  );
  expect(serious).toEqual([]);
});

/**
 * The drop panel — the product's primary interaction, and the one surface this
 * gate never scanned.
 *
 * Its five actions were `<button role="listitem">`. The attribute overrides a
 * native button's implicit role, so assistive technology announced the first
 * thing anyone does with a file as a list item, not something you can press.
 * Nothing caught it: the static pages here have no dialog, and the panel only
 * exists once a file has been dropped.
 */
test("the drop panel announces its actions as buttons", async ({ page }) => {
  const doc = await PDFDocument.create();
  for (let i = 0; i < 3; i += 1) doc.addPage([300, 400]);

  await page.goto("/");
  await page.locator('input[type="file"]').first().setInputFiles({
    name: "dropped.pdf",
    mimeType: "application/pdf",
    buffer: Buffer.from(await doc.save()),
  });

  const panel = page.getByRole("dialog").first();
  await expect(panel).toBeVisible();

  // What a screen reader is offered: real buttons, not list items.
  await expect(panel.getByRole("listitem")).toHaveCount(0);
  const actions = panel.getByRole("button");
  expect(await actions.count()).toBeGreaterThan(1);
  await expect(panel.getByRole("button", { name: /Organize Pages/i })).toBeVisible();

  const results = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa"]).analyze();
  const serious = results.violations.filter(
    (v) => v.impact === "serious" || v.impact === "critical",
  );
  expect(serious, serious.map((v) => `${v.id}: ${v.help}`).join("\n")).toEqual([]);
});
