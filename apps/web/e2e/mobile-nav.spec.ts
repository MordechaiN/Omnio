import { expect, test } from "./fixtures";

/**
 * Regression guard for the mobile sidebar. The drawer is a Radix Dialog rendered
 * into a body-level portal; if its fixed-position insets fail to resolve (as the
 * non-existent `inset-block-0` utility once did), the panel drops to its static
 * position far below the fold and only the backdrop is visible. These specs assert
 * the panel is actually pinned to the top of the viewport once opened.
 */
test.describe("mobile navigation drawer", () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test("hamburger opens the sidebar into the viewport (en)", async ({ page }) => {
    await page.goto("/en");
    const trigger = page.getByRole("button", { name: "Open navigation" });
    await expect(trigger).toBeVisible();
    await trigger.click();

    const panel = page.locator("[data-omnio-sheet]");
    await expect(panel).toBeVisible();
    // Nav links inside the drawer must be reachable, not pushed off-screen.
    const home = panel.getByRole("link", { name: "Home" });
    await expect(home).toBeInViewport();

    const box = await panel.boundingBox();
    expect(box).not.toBeNull();
    // Pinned to the top-start corner — regression was y ≈ document height.
    expect(box!.y).toBeLessThan(2);
    expect(box!.x).toBeLessThan(2);
  });

  test("drawer slides from the inline-end in RTL (he)", async ({ page }) => {
    await page.goto("/he");
    await page.getByRole("button", { name: "פתיחת תפריט ניווט" }).click();
    const panel = page.locator("[data-omnio-sheet]");
    await expect(panel).toBeVisible();
    const box = await panel.boundingBox();
    expect(box).not.toBeNull();
    expect(box!.y).toBeLessThan(2);
    // start = right edge in RTL, so the panel hugs the viewport's right side.
    expect(box!.x + box!.width).toBeGreaterThan(390 - 2);
  });
});
