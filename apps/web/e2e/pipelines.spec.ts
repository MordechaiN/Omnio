import { PDFDocument, rgb } from "pdf-lib";
import type { Page } from "@playwright/test";
import { expect, test } from "./fixtures";

/**
 * Pipelines proven from the outside, by doing what a person does.
 *
 * A class of bug kept getting through: the logic had unit tests, the button
 * rendered, the store method existed — and nothing in the product ever called
 * it, or nothing ever showed the result. Facts were computed nowhere. Saved
 * chains were stored and then displayed on no screen. Saved searches could be
 * created and never removed. Every one of those passed its own tests.
 *
 * The rule these tests follow: never write to the database, never seed state.
 * Import real files, click real controls, then look for the outcome where a
 * person would look for it.
 */

async function samplePdf(shade = 0.3): Promise<Buffer> {
  const doc = await PDFDocument.create();
  doc.addPage([300, 400]).drawRectangle({
    x: 30, y: 60, width: 240, height: 280, color: rgb(shade, shade, shade),
  });
  return Buffer.from(await doc.save());
}

/** Files is hydrated once its heading is up; dropping before that races the app. */
async function gotoFiles(page: Page) {
  await page.goto("/files");
  await expect(page.getByRole("heading", { level: 1, name: "Files" })).toBeVisible();
}

async function drop(page: Page, name: string, bytes: Buffer, mime = "application/pdf") {
  await page.evaluate(
    async ({ b, n, m }) => {
      const dt = new DataTransfer();
      dt.items.add(new File([new Uint8Array(b)], n, { type: m }));
      window.dispatchEvent(
        Object.assign(new Event("drop", { bubbles: true, cancelable: true }), { dataTransfer: dt }),
      );
    },
    { b: [...bytes], n: name, m: mime },
  );
  await expect(page.getByRole("dialog")).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).toBeHidden();
}

test.describe("pipelines end to end", () => {
  /**
   * A saved chain used to vanish: it was written to the workspace and rendered
   * on no screen, while the Library's Workflows section listed a different,
   * hand-built kind entirely. `removeChain` had no caller in the product at all.
   */
  test("a workflow Omnio learns can be found and forgotten", async ({ page }) => {
    // Four real tool round-trips, each with a download. That is genuinely slower
    // than a default timeout allows once the suite runs in parallel, and a test
    // that fails on contention teaches people to ignore failures.
    test.slow();

    // Rotate twice, on two different documents — real work through a real tool,
    // producing the same two-step sequence Omnio can learn from.
    for (const tag of ["one", "two"]) {
      await gotoFiles(page);
      await drop(page, `scan-${tag}.pdf`, await samplePdf());

      for (let step = 0; step < 2; step += 1) {
        await gotoFiles(page);
        // The newest file is first: the original, then what rotation produced.
        await page.getByTestId("file-grid").getByRole("button").first().click();
        await page
          .getByRole("complementary", { name: "File details" })
          .getByRole("button", { name: "Rotate PDF" })
          .click();
        await expect(page).toHaveURL(/pdf-rotate/);
        const done = page.waitForEvent("download");
        await page.getByRole("button", { name: /Rotate/ }).last().click();
        await done;
      }
    }

    // Omnio should now offer to remember the sequence it watched twice.
    await page.goto("/");
    const remember = page.getByRole("button", { name: "Remember this workflow" });
    await expect(remember).toBeVisible();
    await remember.click();

    // And it must be somewhere a person can find it — not only in the database.
    await page.goto("/library");
    const workflows = page.getByRole("region", { name: /Workflows/i });
    const saved = workflows.locator("li").first();
    await expect(saved).toBeVisible();

    // Including a way to take it back.
    await saved.hover();
    await saved.getByRole("button", { name: /Forget/ }).click();
    await expect(workflows.locator("li")).toHaveCount(0);
  });

  /** Saved searches could only ever accumulate; `removeSearch` had no caller. */
  test("a saved search can be forgotten", async ({ page }) => {
    await gotoFiles(page);
    await drop(page, "quarterly.pdf", await samplePdf());

    await page.getByPlaceholder("Search files…").fill("quarterly");
    await page.getByRole("button", { name: "Saved searches" }).click();
    await page.getByRole("menuitem", { name: "Save this search" }).click();
    await page.getByRole("textbox", { name: /name/i }).fill("Quarterlies");
    await page.getByRole("button", { name: /^Save$/ }).click();

    await page.getByRole("button", { name: "Saved searches" }).click();
    await expect(page.getByRole("menuitem", { name: /Quarterlies/ })).toBeVisible();

    await page.getByRole("button", { name: /Forget the saved search/ }).click();
    await expect(page.getByRole("menuitem", { name: /Quarterlies/ })).toBeHidden();
  });
});
