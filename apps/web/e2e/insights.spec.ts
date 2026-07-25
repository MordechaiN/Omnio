import type { Page } from "@playwright/test";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import { expect, test } from "./fixtures";

/**
 * What Omnio notices about a file, and the evidence it gives. These assert the
 * *reason* as much as the conclusion: a suggestion the user cannot account for
 * is worse than no suggestion.
 */

/** A page with ink but no text — what a scan actually looks like. */
async function scanLikePdf(): Promise<Buffer> {
  const doc = await PDFDocument.create();
  const page = doc.addPage([300, 400]);
  page.drawRectangle({ x: 30, y: 60, width: 240, height: 280, color: rgb(0.15, 0.15, 0.18) });
  return Buffer.from(await doc.save());
}

/** A page carrying real, selectable text. */
async function textPdf(): Promise<Buffer> {
  const doc = await PDFDocument.create();
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const page = doc.addPage([300, 400]);
  page.drawText("Quarterly report", { x: 30, y: 320, size: 18, font });
  return Buffer.from(await doc.save());
}

/** An empty sheet: no text, no ink. */
async function blankPdf(): Promise<Buffer> {
  const doc = await PDFDocument.create();
  doc.addPage([300, 400]);
  return Buffer.from(await doc.save());
}

async function dropPdf(page: Page, name: string, bytes: Buffer) {
  await page.goto("/files");
  await expect(page.getByRole("heading", { level: 1, name: "Files" })).toBeVisible();
  await page.evaluate(
    async ({ b, fileName }) => {
      const dt = new DataTransfer();
      dt.items.add(new File([new Uint8Array(b)], fileName, { type: "application/pdf" }));
      window.dispatchEvent(
        Object.assign(new Event("drop", { bubbles: true, cancelable: true }), { dataTransfer: dt }),
      );
    },
    { b: [...bytes], fileName: name },
  );
  const dialog = page.getByRole("dialog");
  await expect(dialog).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(dialog).toBeHidden();
}

const inspectorOf = (page: Page) => page.getByRole("complementary", { name: "File details" });
const tile = (page: Page, name: string) =>
  page.getByTestId("file-grid").getByRole("button", { name, exact: true });

test.describe("what Omnio notices", () => {
  test("recognizes a scan and offers to make it searchable, with the reason", async ({ page }) => {
    await dropPdf(page, "receipt.pdf", await scanLikePdf());
    await tile(page, "receipt.pdf").click();

    const inspector = inspectorOf(page);
    await expect(inspector.getByText("Looks like a scan", { exact: true })).toBeVisible();
    // The evidence is the point — not a tooltip, the sentence itself.
    await expect(inspector.getByText(/No selectable text/)).toBeVisible();
    await expect(inspector.getByRole("button", { name: /OCR/ })).toBeVisible();
  });

  test("stays quiet about a PDF that already has text", async ({ page }) => {
    await dropPdf(page, "report.pdf", await textPdf());
    await tile(page, "report.pdf").click();
    await page.waitForTimeout(1500);
    await expect(inspectorOf(page).getByText("Looks like a scan", { exact: true })).toBeHidden();
  });

  test("does not call an empty page a scan", async ({ page }) => {
    // A blank sheet has no text either. Claiming it is a scan would be wrong,
    // and a wrong claim costs more trust than silence.
    await dropPdf(page, "empty.pdf", await blankPdf());
    await tile(page, "empty.pdf").click();
    await page.waitForTimeout(1500);
    await expect(inspectorOf(page).getByText("Looks like a scan", { exact: true })).toBeHidden();
  });

  test("recognizes a screen capture by how it is named", async ({ page }) => {
    await page.goto("/files");
    await expect(page.getByRole("heading", { level: 1, name: "Files" })).toBeVisible();
    await page.evaluate(async () => {
      const canvas = document.createElement("canvas");
      canvas.width = 400;
      canvas.height = 300;
      const ctx = canvas.getContext("2d")!;
      ctx.fillStyle = "#4c6ef5";
      ctx.fillRect(0, 0, 400, 300);
      const blob = await new Promise<Blob | null>((r) => canvas.toBlob(r, "image/png"));
      const dt = new DataTransfer();
      dt.items.add(new File([blob!], "Screenshot 2026-07-25.png", { type: "image/png" }));
      window.dispatchEvent(
        Object.assign(new Event("drop", { bubbles: true, cancelable: true }), { dataTransfer: dt }),
      );
    });
    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(dialog).toBeHidden();

    await tile(page, "Screenshot 2026-07-25.png").click();
    await expect(inspectorOf(page).getByText("Looks like a screenshot")).toBeVisible();
    await expect(inspectorOf(page).getByText(/Named like a screen capture/)).toBeVisible();
  });

  test("points out that you already have the same file", async ({ page }) => {
    const bytes = await textPdf();
    await dropPdf(page, "copy-a.pdf", bytes);
    await dropPdf(page, "copy-b.pdf", bytes);
    await tile(page, "copy-b.pdf").click();
    await expect(inspectorOf(page).getByText("You already have this file")).toBeVisible();
  });
});

test.describe("home", () => {
  test("shows an imported file under Recent, with what Omnio noticed", async ({ page }) => {
    // Importing is finished work, so it belongs under Recent — not Continue.
    await dropPdf(page, "resume.pdf", await textPdf());
    await page.goto("/");
    await expect(page.getByRole("heading", { name: "Recent" })).toBeVisible();
    await expect(page.getByRole("link", { name: /resume\.pdf/ })).toBeVisible();
  });
});
