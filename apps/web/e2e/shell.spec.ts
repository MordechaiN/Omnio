import { expect, gotoApp, test } from "./fixtures";

test.describe("app shell & landing", () => {
  test("home is the category browser, not a marketing page (en)", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("heading", { level: 1 })).toContainText("Drop any file to get started");
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
    await expect(page.getByRole("heading", { level: 1 })).toContainText("גררו קובץ כדי להתחיל");
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

  /**
   * Search is the product's primary entry point, so the obvious query must give
   * the obvious answer. "compress" used to rank Create ZIP first — it lists
   * "compress" as a hidden keyword — pushing the two tools actually named for
   * the query to fourth and fifth, so Enter opened the wrong tool.
   */
  test("ranks the tool named for the query above one that merely lists it", async ({ page }) => {
    await gotoApp(page);
    await page.keyboard.press("Control+k");
    await page.getByRole("dialog").waitFor();
    await page.keyboard.type("compress");

    const options = page.getByRole("option");
    await expect(options.first()).toHaveText(/Compress PDF|Image Compressor/);
    await page.keyboard.press("Enter");
    await expect(page).toHaveURL(/(pdf-compress|image-compress)/);
  });

  /**
   * The palette opens from ⌘K and from a plain button, never from a Radix
   * trigger, so nothing restored focus when it closed — it fell to <body> and a
   * keyboard user had to tab from the top of the page again.
   */
  test("gives focus back to wherever it came from", async ({ page }) => {
    await gotoApp(page);
    const search = page.getByRole("button", { name: "Search" }).first();
    await search.focus();
    await page.keyboard.press("Enter");
    await page.getByRole("dialog").waitFor();
    await page.keyboard.press("Escape");
    await expect(search).toBeFocused();
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
