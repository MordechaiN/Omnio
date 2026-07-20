import { expect, gotoApp, test } from "./fixtures";

test.describe("app shell & landing", () => {
  test("home is the category browser, not a marketing page (en)", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("heading", { level: 1 })).toContainText("Welcome to Omnio");
    await expect(page.getByRole("link", { name: "Developer" }).first()).toBeVisible();
    // Empty categories are hidden until they have tools — no dead-end cards.
    await expect(page.getByRole("link", { name: "PDF", exact: true })).toHaveCount(0);
    // The old landing-page sections must be gone.
    await expect(page.getByText("Why Omnio")).toHaveCount(0);
    await expect(page.getByText("Questions, answered")).toHaveCount(0);
  });

  test("hebrew locale renders natively in RTL", async ({ page }) => {
    await page.goto("/he");
    await expect(page.locator("html")).toHaveAttribute("dir", "rtl");
    await expect(page.locator("html")).toHaveAttribute("lang", "he");
    await expect(page.getByRole("heading", { level: 1 })).toContainText("ברוכים הבאים");
  });

  test("category page is reachable from the sidebar and lists its tools", async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.goto("/");
    await page
      .getByRole("navigation", { name: "Categories" })
      .getByRole("link", { name: "Developer" })
      .click();
    await expect(page).toHaveURL(/\/t\/developer$/);
    await expect(page.getByRole("heading", { level: 1, name: "Developer" })).toBeVisible();
    // The category page must actually list tools, not a stale "coming soon" state.
    await expect(page.getByText("No tools here yet")).toHaveCount(0);
  });

  test("no dead-end categories — even AI, the last to open, lists tools", async ({ page }) => {
    // Every category now has at least one working tool (M14 closed the set).
    await page.goto("/t/ai");
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    await expect(page.getByText("No tools here yet")).toHaveCount(0);
    await expect(page.getByRole("link", { name: /Prompt Variables/ })).toBeVisible();
  });

  test("keyboard-only: skip link is the first tab stop", async ({ page }) => {
    await gotoApp(page);
    await page.keyboard.press("Tab");
    await expect(page.getByRole("link", { name: "Skip to content" })).toBeFocused();
  });
});

test.describe("command palette", () => {
  test("opens with Ctrl+K, filters, and navigates", async ({ page }) => {
    await gotoApp(page);
    await page.keyboard.press("ControlOrMeta+k");
    const input = page.getByPlaceholder("Type a command or search…");
    await expect(input).toBeVisible();
    await expect(input).toBeFocused();

    // Select the category option explicitly: "images" also matches the Image
    // Resizer tool, and fuzzy ranking between them is not part of this contract.
    await input.fill("images");
    await page.getByRole("option", { name: "Images", exact: true }).click();
    await expect(page).toHaveURL(/\/t\/images$/);
  });

  test("switches theme from the palette", async ({ page }) => {
    await gotoApp(page);
    await page.keyboard.press("ControlOrMeta+k");
    await page.getByPlaceholder("Type a command or search…").fill("dark");
    await page.getByRole("option", { name: "Switch to dark theme" }).click();
    await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  });

  test("switches language from the palette", async ({ page }) => {
    await gotoApp(page);
    await page.keyboard.press("ControlOrMeta+k");
    await page.getByPlaceholder("Type a command or search…").fill("עברית");
    await page.getByRole("option", { name: "עברית" }).click();
    await expect(page).toHaveURL(/\/he$/);
    await expect(page.locator("html")).toHaveAttribute("dir", "rtl");
  });
});

test.describe("settings", () => {
  test("high contrast toggle applies data-contrast", async ({ page }) => {
    await page.goto("/settings");
    await page.getByRole("switch", { name: "High contrast" }).click();
    await expect(page.locator("html")).toHaveAttribute("data-contrast", "high");
    // persists across reload via the pre-paint init script
    await page.reload();
    await expect(page.locator("html")).toHaveAttribute("data-contrast", "high");
  });
});
