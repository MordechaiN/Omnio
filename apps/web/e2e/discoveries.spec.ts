import type { Page } from "@playwright/test";
import { PDFDocument, rgb } from "pdf-lib";
import { expect, test } from "./fixtures";

/**
 * The claim: Omnio watches how you work and tells you the thing you would have
 * missed. The sharpest case is an export that has quietly gone out of date —
 * you turned a document into a PDF, then a newer version of the document
 * arrived, and nothing anywhere would normally say so.
 *
 * A converter website structurally cannot make this observation: it sees one
 * file, once, and forgets. Omnio saw both, and recorded which came from which.
 */

async function samplePdf(shade: number): Promise<Buffer> {
  const doc = await PDFDocument.create();
  const page = doc.addPage([300, 400]);
  page.drawRectangle({ x: 30, y: 60, width: 240, height: 280, color: rgb(shade, shade, shade) });
  return Buffer.from(await doc.save());
}

/** Drop a file into the workspace and dismiss the intelligence dialog. */
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

/**
 * Backdate everything already in the workspace.
 *
 * Discoveries deliberately say nothing about work still in progress, so a test
 * that imports and immediately asserts would — correctly — see nothing. This
 * ages the records rather than weakening the rule they are testing.
 */
async function ageWorkspace(page: Page, days: number) {
  await page.evaluate(async (d) => {
    const shift = d * 86_400_000;
    const db: IDBDatabase = await new Promise((resolve, reject) => {
      const request = indexedDB.open("omnio-workspace");
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(["files", "events"], "readwrite");
      const files = tx.objectStore("files");
      files.openCursor().onsuccess = (event) => {
        const cursor = (event.target as IDBRequest<IDBCursorWithValue>).result;
        if (!cursor) return;
        const file = cursor.value as { createdAt: number; lastOpenedAt: number };
        cursor.update({ ...file, createdAt: file.createdAt - shift, lastOpenedAt: file.lastOpenedAt - shift });
        cursor.continue();
      };
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
    db.close();
  }, days);
}

test.describe("workspace discoveries", () => {
  test("notices that an export no longer reflects its source", async ({ page }) => {
    const original = await samplePdf(0.2);
    const revised = await samplePdf(0.7);

    // Bring in a document and produce something from it.
    await drop(page, "report.pdf", original);
    await tile(page, "report.pdf").click();
    await inspector(page).getByRole("button", { name: "Rotate PDF" }).click();
    await expect(page).toHaveURL(/pdf-rotate/);
    const download = page.waitForEvent("download");
    await page.getByRole("button", { name: /Rotate/ }).last().click();
    await download;

    // That work is now in the past, not something being done right now.
    await page.goto("/files");
    await ageWorkspace(page, 3);

    // A revised copy of the source arrives under the same name.
    await drop(page, "report.pdf", revised);

    // Home says the earlier result is out of date, and why.
    await page.goto("/");
    const discoveries = page.getByRole("region", { name: "Omnio noticed" });
    await expect(discoveries).toBeVisible();
    await expect(discoveries.getByText(/may be out of date/)).toBeVisible();
    await expect(discoveries.getByText(/a newer version of that file arrived/)).toBeVisible();
  });

  test("says nothing at all about an empty workspace", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("region", { name: "Omnio noticed" })).toBeHidden();
  });

  /**
   * The point of the actions: noticing is only worth anything if the next step
   * costs one click. Grouping is the safe action for a set of drafts — Omnio
   * cannot know which one is still wanted, so it organises rather than removes,
   * and what it did can be taken straight back.
   */
  test("turns what it noticed into one click, and lets it be undone", async ({ page }) => {
    // The same document, saved twice with different contents.
    await drop(page, "report.pdf", await samplePdf(0.2));
    await drop(page, "report.pdf", await samplePdf(0.8));

    await page.goto("/");
    const discoveries = page.getByRole("region", { name: "Omnio noticed" });
    const versions = discoveries.locator("li").filter({ hasText: "versions of report" });
    await expect(versions).toBeVisible();

    await versions.getByRole("button", { name: "Group as a collection" }).click();

    // The row reports what happened rather than leaving the user to check.
    await expect(versions.getByText("Grouped into report")).toBeVisible();

    await versions.getByRole("button", { name: "Undo" }).click();
    await expect(versions.getByRole("button", { name: "Group as a collection" })).toBeVisible();
  });
});
