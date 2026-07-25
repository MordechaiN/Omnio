import { expect, test } from "./fixtures";

/**
 * What's New is product copy, and must read as though Omnio was written in the
 * reader's language. These assert both that the right language appears and that
 * the other one does not leak into the page.
 */

test.describe("what's new", () => {
  test("reads in English for English readers", async ({ page }) => {
    await page.goto("/en/changelog");
    await expect(page.getByRole("heading", { name: /v0\.8\.0-alpha/ })).toBeVisible();
    await expect(page.getByText("Omnio starts paying attention.")).toBeVisible();
    await expect(page.getByText(/Chains\./)).toBeVisible();
  });

  test("reads in Hebrew for Hebrew readers", async ({ page }) => {
    await page.goto("/he/changelog");
    await expect(page.getByRole("heading", { name: /v0\.8\.0-alpha/ })).toBeVisible();
    await expect(page.getByText("Omnio מתחיל לשים לב.")).toBeVisible();
    // The Hebrew page must not fall back to English copy anywhere.
    await expect(page.getByText("Omnio starts paying attention.")).toBeHidden();
    await expect(page.getByText("Chains.", { exact: true })).toBeHidden();
  });

  test("shows the whole history in Hebrew, not only recent releases", async ({ page }) => {
    await page.goto("/he/changelog");
    // The very first release must be there, and in Hebrew.
    await expect(page.getByRole("heading", { name: /v0\.1\.0-alpha\.1/ })).toBeVisible();
    await expect(page.getByText(/סביבת עבודה פרטית/)).toBeVisible();
  });

  test("labels its sections in the reader's language", async ({ page }) => {
    await page.goto("/he/changelog");
    await expect(page.getByRole("heading", { name: /חדש/ }).first()).toBeVisible();
  });
});
