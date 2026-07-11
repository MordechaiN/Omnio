import { expect, test } from "@playwright/test";

test("landing page renders the brand and the three entry points", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1, name: "Omnio" })).toBeVisible();
  await expect(page.getByText("Everything. One Workspace.")).toBeVisible();
  for (const entry of ["Search", "Categories", "Drop a file"]) {
    await expect(page.getByRole("heading", { level: 2, name: entry })).toBeVisible();
  }
});
