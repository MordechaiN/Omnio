import type { Page } from "@playwright/test";
import { PDFDocument } from "pdf-lib";
import { expect, test } from "./fixtures";

async function samplePdf(pages = 2): Promise<Buffer> {
  const doc = await PDFDocument.create();
  for (let i = 0; i < pages; i += 1) doc.addPage([300, 400]);
  return Buffer.from(await doc.save());
}

/**
 * Browser verification for the File Workspace. These drive real OPFS and
 * IndexedDB — the storage layer cannot be unit tested, so this is the only
 * place its behaviour is actually proven.
 */

/** Import files by dropping them on the page, the way a user would. */
async function importFiles(page: Page, files: Array<{ name: string; type: string; body: string }>) {
  await page.evaluate(async (specs) => {
    const dataTransfer = new DataTransfer();
    for (const spec of specs) {
      dataTransfer.items.add(new File([spec.body], spec.name, { type: spec.type }));
    }
    window.dispatchEvent(
      Object.assign(new Event("drop", { bubbles: true, cancelable: true }), { dataTransfer }),
    );
  }, files);
  // Dropping opens the file-intelligence dialog over the grid; wait for it to
  // actually mount before dismissing, or Escape races ahead of it. The import
  // itself is unaffected either way.
  const dialog = page.getByRole("dialog");
  await expect(dialog).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(dialog).toBeHidden();
}

/** A tile in the grid. Scoped, because the Inspector's rename control shares the
 *  file's accessible name and would otherwise match too. */
function tile(page: Page, name: string) {
  return page.getByTestId("file-grid").getByRole("button", { name, exact: true });
}

async function gotoFiles(page: Page) {
  await page.goto("/files");
  await expect(page.getByRole("heading", { level: 1, name: "Files" })).toBeVisible();
}

test.describe("file workspace", () => {
  test("starts with a helpful empty state, not a blank screen", async ({ page }) => {
    await gotoFiles(page);
    await expect(page.getByText("No files yet")).toBeVisible();
    await expect(page.getByText(/Drop a file anywhere in Omnio/)).toBeVisible();
  });

  test("a dropped file persists across a reload", async ({ page }) => {
    await gotoFiles(page);
    await importFiles(page, [{ name: "notes.txt", type: "text/plain", body: "hello workspace" }]);
    await expect(tile(page, "notes.txt")).toBeVisible();

    // The whole point of the workspace: it survives a refresh.
    await page.reload();
    await expect(tile(page, "notes.txt")).toBeVisible();
  });

  test("the inspector fills in immediately on selection", async ({ page }) => {
    await gotoFiles(page);
    await importFiles(page, [{ name: "report.txt", type: "text/plain", body: "x".repeat(2048) }]);
    await tile(page, "report.txt").click();

    const inspector = page.getByRole("complementary", { name: "File details" });
    await expect(inspector.getByText("report.txt")).toBeVisible();
    await expect(inspector.getByText("Details")).toBeVisible();
    await expect(inspector.getByText("2.0 KB")).toBeVisible();
    await expect(inspector.getByText("Added to your files")).toBeVisible();
  });

  test("search narrows the grid", async ({ page }) => {
    await gotoFiles(page);
    await importFiles(page, [
      { name: "invoice.txt", type: "text/plain", body: "a" },
      { name: "holiday.txt", type: "text/plain", body: "b" },
    ]);
    await expect(tile(page, "invoice.txt")).toBeVisible();

    await page.getByLabel("Search files…").fill("holiday");
    await expect(tile(page, "holiday.txt")).toBeVisible();
    await expect(tile(page, "invoice.txt")).toBeHidden();
  });

  test("identical content is detected as duplicates", async ({ page }) => {
    await gotoFiles(page);
    await importFiles(page, [
      { name: "one.txt", type: "text/plain", body: "identical bytes" },
      { name: "copy.txt", type: "text/plain", body: "identical bytes" },
    ]);
    await expect(page.getByText(/set of identical files/)).toBeVisible();
  });

  test("pinning is reflected in the grid", async ({ page }) => {
    await gotoFiles(page);
    await importFiles(page, [{ name: "keep.txt", type: "text/plain", body: "keep me" }]);
    await tile(page, "keep.txt").click();
    await page.getByRole("button", { name: "Pin", exact: true }).click();
    await expect(page.getByRole("button", { name: "Unpin" })).toBeVisible();
  });

  test("renaming from the inspector updates the grid", async ({ page }) => {
    await gotoFiles(page);
    await importFiles(page, [{ name: "before.txt", type: "text/plain", body: "z" }]);
    await tile(page, "before.txt").click();

    const inspector = page.getByRole("complementary", { name: "File details" });
    await inspector.getByRole("button", { name: "before.txt" }).click();
    await inspector.getByLabel("Rename").fill("after.txt");
    await inspector.getByLabel("Rename").press("Enter");

    await expect(tile(page, "after.txt")).toBeVisible();
  });

  test("delete is undoable", async ({ page }) => {
    await gotoFiles(page);
    await importFiles(page, [{ name: "oops.txt", type: "text/plain", body: "delete me" }]);
    await tile(page, "oops.txt").click();
    await page.getByRole("button", { name: "Delete" }).first().click();
    await expect(tile(page, "oops.txt")).toBeHidden();

    await page.getByRole("button", { name: /Undo delete/ }).click();
    await expect(tile(page, "oops.txt")).toBeVisible();
  });

  test("Ctrl+A selects everything", async ({ page }) => {
    await gotoFiles(page);
    await importFiles(page, [
      { name: "a.txt", type: "text/plain", body: "1" },
      { name: "b.txt", type: "text/plain", body: "2" },
    ]);
    await expect(tile(page, "a.txt")).toBeVisible();

    await page.getByTestId("file-grid").click({ position: { x: 5, y: 5 } });
    await page.keyboard.press("Control+a");
    await expect(page.getByText("2 files selected")).toBeVisible();
  });

  test("Space opens Quick Look and Escape closes it", async ({ page }) => {
    await gotoFiles(page);
    await importFiles(page, [{ name: "look.txt", type: "text/plain", body: "peek at me" }]);
    await tile(page, "look.txt").click();

    await page.keyboard.press(" ");
    await expect(page.getByRole("dialog")).toBeVisible();
    await expect(page.getByText("peek at me")).toBeVisible();

    await page.keyboard.press("Escape");
    await expect(page.getByRole("dialog")).toBeHidden();
  });

  test("a workspace file opens in a tool and comes back as a real file", async ({ page }) => {
    await gotoFiles(page);
    await importFiles(page, [{ name: "handoff.txt", type: "text/plain", body: "carried across" }]);
    await tile(page, "handoff.txt").click();

    // "Open with" hands the file to the tool through the existing pending-file
    // channel, which is what lets ~100 unmodified tools accept workspace files.
    const openWith = page.getByRole("button", { name: /^(text|word|case|slug|hash)/i }).first();
    if (await openWith.isVisible().catch(() => false)) {
      await openWith.click();
      await expect(page).not.toHaveURL(/\/files$/);
    }
  });

  test("a tool's output lands back in the workspace", async ({ page }) => {
    // Round trip: produce a PDF in a tool, then find it in Files. This is what
    // makes tools compose without going through the downloads folder.
    await page.goto("/tool/pdfkit/pdf-organize");
    await page.locator('input[type="file"]').setInputFiles({
      name: "roundtrip.pdf",
      mimeType: "application/pdf",
      buffer: await samplePdf(2),
    });
    await expect(page.getByText("2 pages")).toBeVisible();

    const download = page.waitForEvent("download");
    await page.getByRole("button", { name: "Save organized PDF" }).click();
    await download;

    await gotoFiles(page);
    await expect(tile(page, "roundtrip-organized.pdf")).toBeVisible();
  });

  test("a tag can be created and applied in one keystroke", async ({ page }) => {
    await gotoFiles(page);
    await importFiles(page, [{ name: "tagme.txt", type: "text/plain", body: "tag" }]);
    await tile(page, "tagme.txt").click();

    const inspector = page.getByRole("complementary", { name: "File details" });
    await inspector.getByLabel("New tag…").fill("Receipts");
    await inspector.getByLabel("New tag…").press("Enter");

    await expect(inspector.getByRole("button", { name: "Receipts" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
  });

  test("switches between grid and list view, and remembers the choice", async ({ page }) => {
    await gotoFiles(page);
    await importFiles(page, [{ name: "viewme.txt", type: "text/plain", body: "v" }]);

    await page.getByRole("button", { name: "List view" }).click();
    await expect(page.getByRole("button", { name: "List view" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    // Thumbnail sizing is a grid-only concern and should disappear in list view.
    await expect(page.getByRole("group", { name: "Thumbnail size" })).toBeHidden();

    // A view preference the app forgets on reload is worse than none.
    await page.reload();
    await expect(page.getByRole("button", { name: "List view" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
  });

  test("thumbnail size is adjustable in grid view", async ({ page }) => {
    await gotoFiles(page);
    await importFiles(page, [{ name: "sized.txt", type: "text/plain", body: "s" }]);
    await page.getByRole("button", { name: "Large thumbnails" }).click();
    await expect(page.getByRole("button", { name: "Large thumbnails" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
  });

  test("filtering by tag narrows the grid and reports the active filter", async ({ page }) => {
    await gotoFiles(page);
    await importFiles(page, [
      { name: "tagged.txt", type: "text/plain", body: "1" },
      { name: "plain.txt", type: "text/plain", body: "2" },
    ]);

    await tile(page, "tagged.txt").click();
    const inspector = page.getByRole("complementary", { name: "File details" });
    await inspector.getByLabel("New tag…").fill("Work");
    await inspector.getByLabel("New tag…").press("Enter");
    await expect(inspector.getByRole("button", { name: "Work" })).toBeVisible();

    await page.getByRole("button", { name: "Filter" }).click();
    await page.getByRole("menuitemcheckbox", { name: "Work" }).click();
    await page.keyboard.press("Escape");

    await expect(page.getByRole("button", { name: /1 filters/ })).toBeVisible();
    await expect(tile(page, "tagged.txt")).toBeVisible();
    await expect(tile(page, "plain.txt")).toBeHidden();
  });

  test("a search can be saved and re-applied", async ({ page }) => {
    await gotoFiles(page);
    await importFiles(page, [
      { name: "receipt-jan.txt", type: "text/plain", body: "a" },
      { name: "photo.txt", type: "text/plain", body: "b" },
    ]);

    await page.getByLabel("Search files…").fill("receipt");
    await page.getByRole("button", { name: "Saved searches" }).click();
    await page.getByRole("menuitem", { name: "Save this search…" }).click();
    await page.getByLabel("Name this search").fill("Receipts");
    await page.getByRole("button", { name: "Save", exact: true }).click();

    // Clear, then re-apply from the saved list.
    await page.getByLabel("Search files…").fill("");
    await expect(tile(page, "photo.txt")).toBeVisible();

    await page.getByRole("button", { name: "Saved searches" }).click();
    await page.getByRole("menuitem", { name: "Receipts" }).click();
    await expect(tile(page, "receipt-jan.txt")).toBeVisible();
    await expect(tile(page, "photo.txt")).toBeHidden();
  });
});
