import { expect, test } from "./fixtures";

/**
 * Product identity: who made Omnio, and under what terms. These are part of the
 * product, not repository metadata, so they are asserted like any other feature.
 */

test.describe("identity", () => {
  test("About credits the creator and states the licence", async ({ page }) => {
    await page.goto("/about");
    await expect(page.getByRole("link", { name: /Mordechai Neeman/ })).toBeVisible();
    await expect(page.getByText("Apache-2.0")).toBeVisible();
  });

  test("About is fully Hebrew for Hebrew readers", async ({ page }) => {
    await page.goto("/he/about");
    await expect(page.getByText("נוצר על ידי")).toBeVisible();
    await expect(page.getByRole("link", { name: /Mordechai Neeman/ })).toBeVisible();
  });

  test("the organizer is the first tool offered for a document", async ({ page }) => {
    // It covers reordering, rotating, deleting and duplicating pages in one
    // place, so anything else leading would send people the long way round.
    await page.goto("/files");
    await expect(page.getByRole("heading", { level: 1, name: "Files" })).toBeVisible();
    await page.evaluate(async () => {
      const bytes = new TextEncoder().encode("%PDF-1.4\n%%EOF\n");
      const dt = new DataTransfer();
      dt.items.add(new File([bytes], "doc.pdf", { type: "application/pdf" }));
      window.dispatchEvent(
        Object.assign(new Event("drop", { bubbles: true, cancelable: true }), { dataTransfer: dt }),
      );
    });
    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(dialog).toBeHidden();

    await page.getByTestId("file-grid").getByRole("button", { name: "doc.pdf", exact: true }).click();
    const inspector = page.getByRole("complementary", { name: "File details" });
    await expect(inspector.getByRole("button", { name: "Organize Pages" })).toBeVisible();
  });
});
