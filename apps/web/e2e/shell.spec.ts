import { expect, test } from "@playwright/test";

test.describe("app shell & landing", () => {
  test("home renders hero, categories, roadmap and FAQ (en)", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("heading", { level: 1 })).toContainText(
      "Everything. One workspace.",
    );
    await expect(page.getByRole("link", { name: "PDF", exact: true }).first()).toBeVisible();
    await expect(page.getByText("Why Omnio")).toBeVisible();
    await expect(page.getByText("Questions, answered")).toBeVisible();
  });

  test("hebrew locale renders natively in RTL", async ({ page }) => {
    await page.goto("/he");
    await expect(page.locator("html")).toHaveAttribute("dir", "rtl");
    await expect(page.locator("html")).toHaveAttribute("lang", "he");
    await expect(page.getByRole("heading", { level: 1 })).toContainText("הכול. סביבת עבודה אחת.");
  });

  test("category page is reachable from the sidebar", async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.goto("/");
    await page
      .getByRole("navigation", { name: "Categories" })
      .getByRole("link", { name: "Developer" })
      .click();
    await expect(page).toHaveURL(/\/t\/developer$/);
    await expect(page.getByRole("heading", { level: 1, name: "Developer" })).toBeVisible();
  });

  test("keyboard-only: skip link is the first tab stop", async ({ page }) => {
    await page.goto("/");
    await page.keyboard.press("Tab");
    await expect(page.getByRole("link", { name: "Skip to content" })).toBeFocused();
  });
});

test.describe("command palette", () => {
  test("opens with Ctrl+K, filters, and navigates", async ({ page }) => {
    await page.goto("/");
    await page.keyboard.press("ControlOrMeta+k");
    const input = page.getByPlaceholder("Type a command or search…");
    await expect(input).toBeVisible();
    await expect(input).toBeFocused();

    await input.fill("images");
    await page.keyboard.press("Enter");
    await expect(page).toHaveURL(/\/t\/images$/);
  });

  test("switches theme from the palette", async ({ page }) => {
    await page.goto("/");
    await page.keyboard.press("ControlOrMeta+k");
    await page.getByPlaceholder("Type a command or search…").fill("dark");
    await page.getByRole("option", { name: "Switch to dark theme" }).click();
    await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  });

  test("switches language from the palette", async ({ page }) => {
    await page.goto("/");
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
