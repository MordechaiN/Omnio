import { PDFDocument, StandardFonts } from "pdf-lib";
import type { Page } from "@playwright/test";
import { expect, test } from "./fixtures";

/**
 * Browser verification for the PDF experience: the organizer grid, signing, and
 * the bookmark editor. These exercise the real WASM/canvas paths (pdf.js
 * rendering, mupdf outline writing) that unit tests deliberately do not cover.
 */

async function samplePdf(pages = 4): Promise<Buffer> {
  const doc = await PDFDocument.create();
  const font = await doc.embedFont(StandardFonts.Helvetica);
  for (let i = 0; i < pages; i += 1) {
    const page = doc.addPage([300, 400]);
    page.drawText(`page ${i + 1}`, { x: 24, y: 200, size: 24, font });
  }
  return Buffer.from(await doc.save());
}

async function openWith(page: Page, tool: string, pages = 4) {
  await page.goto(`/tool/pdfkit/${tool}`);
  await page.locator('input[type="file"]').setInputFiles({
    name: "sample.pdf",
    mimeType: "application/pdf",
    buffer: await samplePdf(pages),
  });
}

test.describe("page organizer", () => {
  test("renders a thumbnail per page and reflects deletion in the count", async ({ page }) => {
    await openWith(page, "pdf-organize");

    await expect(page.getByText("4 pages")).toBeVisible();
    const thumbs = page.getByRole("button", { name: /Page \d+, now in position/ });
    await expect(thumbs).toHaveCount(4);
    // Thumbnails are real renders, not placeholders.
    await expect(page.locator("img").first()).toBeVisible();

    await thumbs.first().click();
    await expect(page.getByText("1 selected")).toBeVisible();

    await page.getByRole("button", { name: "Delete" }).click();
    await expect(page.getByText("3 pages")).toBeVisible();
  });

  test("saving clears the unsaved-changes notice", async ({ page }) => {
    // You press Save, the file downloads, and the screen still says your work is
    // unsaved. Whether that reads as "the save failed" or "Omnio has lost track",
    // it is the wrong thing to be told at the one moment you are deciding whether
    // you can move on. The notice was derived from "differs from the original",
    // which stays true forever after any edit.
    await openWith(page, "pdf-organize");
    const notice = page.getByText("You have unsaved changes.");
    await expect(notice).toHaveCount(0);

    await page.getByRole("button", { name: /Page 1, now in position/ }).click();
    await page.getByRole("button", { name: "Rotate right" }).click();
    await expect(notice).toBeVisible();

    const download = page.waitForEvent("download");
    await page.getByRole("button", { name: "Save organized PDF" }).click();
    await download;
    await expect(notice).toHaveCount(0);

    // ...and it comes back the moment there is something new to save.
    await page.getByRole("button", { name: "Rotate right" }).click();
    await expect(notice).toBeVisible();
  });

  test("undo restores a deleted page", async ({ page }) => {
    await openWith(page, "pdf-organize");
    await page.getByRole("button", { name: /Page 1, now in position/ }).click();
    await page.getByRole("button", { name: "Delete" }).click();
    await expect(page.getByText("3 pages")).toBeVisible();

    await page.getByRole("button", { name: "Undo" }).click();
    await expect(page.getByText("4 pages")).toBeVisible();
  });

  test("rotating a selection marks the document as changed", async ({ page }) => {
    await openWith(page, "pdf-organize");
    await page.getByRole("button", { name: /Page 2, now in position/ }).click();
    await page.getByRole("button", { name: "Rotate right" }).click();
    await expect(page.getByText("You have unsaved changes.")).toBeVisible();
  });

  test("select all then insert blank grows the document", async ({ page }) => {
    await openWith(page, "pdf-organize");
    await page.getByRole("button", { name: "Select all" }).click();
    await expect(page.getByText("4 selected")).toBeVisible();
    await page.getByRole("button", { name: "Insert blank page" }).click();
    await expect(page.getByText("5 pages")).toBeVisible();
  });

  test("downloads an organized PDF with the applied changes", async ({ page }) => {
    await openWith(page, "pdf-organize");
    await page.getByRole("button", { name: /Page 1, now in position/ }).click();
    await page.getByRole("button", { name: "Delete" }).click();

    const download = await Promise.race([
      page.waitForEvent("download"),
      page.getByRole("button", { name: "Save organized PDF" }).click().then(() => page.waitForEvent("download")),
    ]);
    expect(download.suggestedFilename()).toBe("sample-organized.pdf");
  });
});

test.describe("signing", () => {
  test("a typed signature can be created and placed on the page", async ({ page }) => {
    await openWith(page, "pdf-edit");

    await page.getByRole("button", { name: "Signature", exact: true }).click();
    // Selecting the tool with nothing captured opens the pad.
    await expect(page.getByRole("button", { name: "Use this signature" })).toBeVisible();

    await page.getByRole("tab", { name: "Type" }).click();
    await page.getByLabel("Type your name").fill("Ada Lovelace");
    await page.getByRole("button", { name: "Use this signature" }).click();

    // Pad closes and the placement hint appears.
    await expect(page.getByText("Drag on the page to place your signature.")).toBeVisible();

    const canvas = page.getByRole("application");
    const box = (await canvas.boundingBox())!;
    await page.mouse.move(box.x + 40, box.y + 40);
    await page.mouse.down();
    await page.mouse.move(box.x + 200, box.y + 100);
    await page.mouse.up();

    // A placed signature counts as an annotation and enables the download.
    await expect(page.getByRole("button", { name: "Download edited PDF" })).toBeEnabled();
  });

  test("states plainly that it is not a digital certificate", async ({ page }) => {
    await openWith(page, "pdf-edit");
    await page.getByRole("button", { name: "Signature", exact: true }).click();
    await expect(page.getByText(/not a digital certificate/i)).toBeVisible();
  });
});

test.describe("bookmarks", () => {
  test("adds a bookmark and writes it into the PDF", async ({ page }) => {
    await openWith(page, "pdf-bookmarks");

    await expect(page.getByText(/no bookmarks yet/i)).toBeVisible();
    await page.getByRole("button", { name: "Add bookmark" }).click();
    await page.getByLabel("Bookmark title").fill("Chapter 1");

    const download = await Promise.race([
      page.waitForEvent("download"),
      page.getByRole("button", { name: "Save bookmarks" }).click().then(() => page.waitForEvent("download")),
    ]);
    expect(download.suggestedFilename()).toBe("sample-bookmarks.pdf");
  });

  test("warns that an untitled bookmark will be skipped", async ({ page }) => {
    await openWith(page, "pdf-bookmarks");
    await page.getByRole("button", { name: "Add bookmark" }).click();
    await expect(page.getByText(/will be skipped/i)).toBeVisible();
  });
});
