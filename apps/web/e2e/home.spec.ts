import type { Page } from "@playwright/test";
import { PDFDocument, rgb } from "pdf-lib";
import { expect, test } from "./fixtures";

/**
 * Home is the desktop of the product. These assert the distinction the redesign
 * turns on: Continue is unfinished work, Recent is merely what you touched.
 */

async function samplePdf(): Promise<Buffer> {
  const doc = await PDFDocument.create();
  const page = doc.addPage([300, 400]);
  page.drawRectangle({ x: 30, y: 60, width: 240, height: 280, color: rgb(0.2, 0.2, 0.25) });
  return Buffer.from(await doc.save());
}

async function importPdf(page: Page, name: string) {
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
    { b: [...(await samplePdf())], n: name },
  );
  const dialog = page.getByRole("dialog");
  await expect(dialog).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(dialog).toBeHidden();
}

/** Open a file in a tool and walk away, which is what "unfinished" means. */
async function abandonInTool(page: Page, name: string) {
  await page.goto("/files");
  await page.getByTestId("file-grid").getByRole("button", { name, exact: true }).click();
  await page
    .getByRole("complementary", { name: "File details" })
    .getByRole("button", { name: "Rotate PDF" })
    .click();
  await expect(page).toHaveURL(/pdf-rotate/);
  // Backdate the event so it counts as settled rather than in-progress.
  await page.evaluate(async () => {
    const db: IDBDatabase = await new Promise((resolve, reject) => {
      const r = indexedDB.open("omnio-workspace");
      r.onsuccess = () => resolve(r.result);
      r.onerror = () => reject(r.error);
    });
    const tx = db.transaction("events", "readwrite");
    const store = tx.objectStore("events");
    const all: IDBRequest<Array<{ id: string; type: string; at: number }>> = store.getAll();
    await new Promise((r) => (all.onsuccess = r));
    for (const event of all.result) {
      if (event.type === "opened") store.put({ ...event, at: Date.now() - 60 * 60 * 1000 });
    }
    await new Promise((r) => (tx.oncomplete = r));
  });
}

test.describe("home", () => {
  test("a first-time visitor sees no work sections at all", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByText("Drop any file to get started")).toBeVisible();
    // Nothing to continue and nothing recent: neither heading should exist.
    await expect(page.getByRole("heading", { name: "Continue" })).toBeHidden();
    await expect(page.getByRole("heading", { name: "Recent" })).toBeHidden();
  });

  test("merely importing a file is Recent, never Continue", async ({ page }) => {
    // Importing is finished work. It must not manufacture an obligation.
    await importPdf(page, "just-imported.pdf");
    await page.goto("/");
    await expect(page.getByRole("heading", { name: "Recent" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Continue" })).toBeHidden();
  });

  test("work opened in a tool and abandoned appears under Continue", async ({ page }) => {
    await importPdf(page, "abandoned.pdf");
    await abandonInTool(page, "abandoned.pdf");

    await page.goto("/");
    const cont = page.getByRole("region", { name: "Continue" });
    await expect(page.getByRole("heading", { name: "Continue" })).toBeVisible();
    // Scoped to the section: the file legitimately appears under Recent too.
    await expect(cont.getByText("abandoned.pdf")).toBeVisible();
    await expect(cont.getByText(/in Rotate PDF/)).toBeVisible();
  });

  test("an item can be waved away and stays away", async ({ page }) => {
    await importPdf(page, "dismissible.pdf");
    await abandonInTool(page, "dismissible.pdf");

    await page.goto("/");
    await expect(page.getByRole("heading", { name: "Continue" })).toBeVisible();
    await page.getByRole("button", { name: /Options for dismissible\.pdf/ }).click();
    await page.getByRole("menuitem", { name: "Remove from Continue" }).click();
    await expect(page.getByRole("heading", { name: "Continue" })).toBeHidden();

    // A dismissal the product forgets on reload is not a dismissal.
    await page.reload();
    await expect(page.getByRole("heading", { name: "Continue" })).toBeHidden();
  });

  test("Omnio can be told to stop tracking a kind of work", async ({ page }) => {
    await importPdf(page, "forgettable.pdf");
    await abandonInTool(page, "forgettable.pdf");

    await page.goto("/");
    await page.getByRole("button", { name: /Options for forgettable\.pdf/ }).click();
    await page.getByRole("menuitem", { name: /Stop tracking Rotate PDF/ }).click();
    await expect(page.getByRole("heading", { name: "Continue" })).toBeHidden();
  });

  test("Home no longer advertises how many tools exist", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByText(/\d+ tools/)).toBeHidden();
  });
});
