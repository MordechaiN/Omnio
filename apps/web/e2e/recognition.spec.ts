import type { Page } from "@playwright/test";
import { PDFDocument, rgb } from "pdf-lib";
import { expect, test } from "./fixtures";

/**
 * The claim: drop a file you have processed before and Omnio hands back the
 * finished work instead of making you redo it. A converter website cannot do
 * this, because it never knew the file in the first place.
 */

async function samplePdf(): Promise<Buffer> {
  const doc = await PDFDocument.create();
  const page = doc.addPage([300, 400]);
  page.drawRectangle({ x: 30, y: 60, width: 240, height: 280, color: rgb(0.2, 0.2, 0.25) });
  return Buffer.from(await doc.save());
}

async function drop(page: Page, name: string, bytes: Buffer) {
  await page.goto("/files");
  await expect(page.getByRole("heading", { level: 1, name: "Files" })).toBeVisible();
  await page.evaluate(
    async ({ b, n }) => {
      const dt = new DataTransfer();
      dt.items.add(new File([new Uint8Array(b)], n, { type: "application/pdf" }));
      window.dispatchEvent(
        Object.assign(new Event("drop", { bubbles: true, cancelable: true }), { dataTransfer: dt }),
      );
    },
    { b: [...bytes], n: name },
  );
  const dialog = page.getByRole("dialog");
  await expect(dialog).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(dialog).toBeHidden();
}

const tile = (page: Page, name: string) =>
  page.getByTestId("file-grid").getByRole("button", { name, exact: true });
const inspector = (page: Page) => page.getByRole("complementary", { name: "File details" });

test.describe("recognition", () => {
  test("hands back work already done on the same file", async ({ page }) => {
    const bytes = await samplePdf();

    // Monday: bring in a scan and rotate it.
    await drop(page, "scan.pdf", bytes);
    await tile(page, "scan.pdf").click();
    await inspector(page).getByRole("button", { name: "Rotate PDF" }).click();
    await expect(page).toHaveURL(/pdf-rotate/);
    const download = page.waitForEvent("download");
    await page.getByRole("button", { name: /Rotate/ }).last().click();
    await download;

    // Next week: the very same file arrives again, under a different name.
    await drop(page, "scan-from-email.pdf", bytes);
    await tile(page, "scan-from-email.pdf").click();

    // Omnio recognises the contents and offers the finished file.
    await expect(inspector(page).getByText("You've had this file before")).toBeVisible();
    await expect(inspector(page).getByText(/You don't have to do the work again/)).toBeVisible();
    await expect(
      inspector(page).getByRole("button", { name: /Open the Rotate PDF result/ }),
    ).toBeVisible();

    // And the offer works: taking it selects the finished file.
    await inspector(page).getByRole("button", { name: /Open the Rotate PDF result/ }).click();
    // The Inspector's title is the rename control, which is unambiguous.
    await expect(
      inspector(page).getByRole("button", { name: "scan-rotated.pdf" }),
    ).toBeVisible();
  });

  test("stays silent for a file it has never handled", async ({ page }) => {
    await drop(page, "brand-new.pdf", await samplePdf());
    await tile(page, "brand-new.pdf").click();
    await expect(inspector(page).getByText("You've had this file before")).toBeHidden();
  });

  test("stays silent when the same file exists but nothing was made from it", async ({ page }) => {
    // A duplicate is worth mentioning, but there is no finished work to offer,
    // so the recognition panel must not appear.
    const bytes = await samplePdf();
    await drop(page, "copy-one.pdf", bytes);
    await drop(page, "copy-two.pdf", bytes);
    await tile(page, "copy-two.pdf").click();
    await expect(inspector(page).getByText("You already have this file")).toBeVisible();
    await expect(inspector(page).getByText("You've had this file before")).toBeHidden();
  });
});
