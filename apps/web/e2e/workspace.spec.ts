import { expect, test } from "@playwright/test";

test.describe("workspace", () => {
  test("launches a tool from the home", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("heading", { name: "Start with a tool" })).toBeVisible();
    await page
      .getByRole("link", { name: /UUID Generator/ })
      .first()
      .click();
    await expect(page.getByRole("heading", { level: 1, name: /UUID Generator/ })).toBeVisible();
  });

  test("favoriting a tool surfaces it under Your favorites", async ({ page }) => {
    await page.goto("/");
    await page
      .getByRole("link", { name: /UUID Generator/ })
      .first()
      .hover();
    await page.getByRole("button", { name: "Add to favorites" }).first().click();
    await page.reload();
    await expect(page.getByRole("heading", { name: "Your favorites" })).toBeVisible();
  });

  test("'/' opens the command palette", async ({ page }) => {
    await page.goto("/");
    await page.keyboard.press("/");
    await expect(page.getByPlaceholder("Type a command or search…")).toBeVisible();
  });
});
