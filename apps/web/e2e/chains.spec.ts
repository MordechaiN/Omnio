import type { Page } from "@playwright/test";
import { PDFDocument } from "pdf-lib";
import { expect, test } from "./fixtures";

/**
 * Chains: sequences learned from work already done, re-run with automatic
 * handoff between tools. The handoff is the claim worth proving — a chain that
 * makes you re-drop the file at each step is just a list of links.
 */

async function samplePdf(pages = 2): Promise<Buffer> {
  const doc = await PDFDocument.create();
  for (let i = 0; i < pages; i += 1) doc.addPage([300, 400]);
  return Buffer.from(await doc.save());
}

/** Drop a PDF into the workspace the way a user does — globally, not into a tool. */
async function importPdf(page: Page, name: string) {
  await page.goto("/files");
  await expect(page.getByRole("heading", { level: 1, name: "Files" })).toBeVisible();
  await page.evaluate(
    async ({ bytes, fileName }) => {
      const dt = new DataTransfer();
      dt.items.add(new File([new Uint8Array(bytes)], fileName, { type: "application/pdf" }));
      window.dispatchEvent(
        Object.assign(new Event("drop", { bubbles: true, cancelable: true }), { dataTransfer: dt }),
      );
    },
    { bytes: [...(await samplePdf())], fileName: name },
  );
  const dialog = page.getByRole("dialog");
  await expect(dialog).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(dialog).toBeHidden();
}

const tile = (page: Page, name: string) =>
  page.getByTestId("file-grid").getByRole("button", { name, exact: true });

const inspectorOf = (page: Page) =>
  page.getByRole("complementary", { name: "File details" });

/**
 * Perform a two-step sequence by hand, so a lineage exists for Omnio to learn
 * from. Each step is opened from the workspace, which is what records where the
 * output came from.
 */
async function performSequence(page: Page, name: string) {
  await importPdf(page, name);
  await tile(page, name).click();
  await inspectorOf(page).getByRole("button", { name: "Rotate PDF" }).click();
  await expect(page).toHaveURL(/pdf-rotate/);
  let download = page.waitForEvent("download");
  await page.getByRole("button", { name: /Rotate/ }).last().click();
  await download;

  await page.goto("/files");
  const produced = name.replace(/\.pdf$/, "-rotated.pdf");
  await expect(tile(page, produced)).toBeVisible();
  await tile(page, produced).click();
  // A second pass of the same tool is a legitimate two-step lineage and keeps
  // this test measuring the chain machinery rather than an engine's load time.
  await inspectorOf(page).getByRole("button", { name: "Rotate PDF" }).click();
  await expect(page).toHaveURL(/pdf-rotate/);
  download = page.waitForEvent("download");
  await page.getByRole("button", { name: /Rotate/ }).last().click();
  await download;
}

test.describe("chains", () => {
  test("Omnio notices a sequence you performed and offers to repeat it", async ({ page }) => {
    await performSequence(page, "scan.pdf");

    // Nobody described a workflow; doing the work once was the configuration.
    await page.goto("/files");
    await tile(page, "scan.pdf").click();
    await expect(inspectorOf(page).getByText(/You did this before|You've done this/)).toBeVisible();
    await expect(inspectorOf(page).getByRole("button", { name: "Do it again" })).toBeVisible();
  });

  test("a produced file is carried into the next step automatically", async ({ page }) => {
    await performSequence(page, "doc.pdf");
    await page.goto("/files");
    await tile(page, "doc.pdf").click();
    await inspectorOf(page).getByRole("button", { name: "Do it again" }).click();

    const bar = page.getByRole("status");
    await expect(bar).toBeVisible();
    await expect(bar.getByText(/Step 1 of 2/)).toBeVisible();

    // Announce a produced file the way every tool does. Driving a real tool
    // here would measure that tool's engine rather than the handoff, which is
    // the behaviour under test.
    await page.evaluate(async () => {
      const doc = new Blob([new Uint8Array([37, 80, 68, 70])], { type: "application/pdf" });
      window.dispatchEvent(
        new CustomEvent("omnio:workspace-produce", {
          detail: { blob: doc, name: "doc-step1.pdf", mime: "application/pdf" },
        }),
      );
    });

    // The chain advances and opens the next tool by itself — no re-dropping.
    await expect(bar.getByText(/Step 2 of 2/)).toBeVisible();
    await expect(page).toHaveURL(/pdf-rotate/);
  });

  test("finishing the last step ends the chain and returns to Files", async ({ page }) => {
    await performSequence(page, "fin.pdf");
    await page.goto("/files");
    await tile(page, "fin.pdf").click();
    await inspectorOf(page).getByRole("button", { name: "Do it again" }).click();

    const bar = page.getByRole("status");
    await expect(bar).toBeVisible();

    for (const step of ["fin-a.pdf", "fin-b.pdf"]) {
      await page.evaluate(async (name) => {
        const doc = new Blob([new Uint8Array([37, 80, 68, 70])], { type: "application/pdf" });
        window.dispatchEvent(
          new CustomEvent("omnio:workspace-produce", {
            detail: { blob: doc, name, mime: "application/pdf" },
          }),
        );
      }, step);
      await page.waitForTimeout(400);
    }

    await expect(bar).toBeHidden();
    await expect(page).toHaveURL(/\/files/);
  });

  test("a chain can be stopped at any point", async ({ page }) => {
    await performSequence(page, "stop.pdf");
    await page.goto("/files");
    await tile(page, "stop.pdf").click();
    await inspectorOf(page).getByRole("button", { name: "Do it again" }).click();

    const bar = page.getByRole("status");
    await expect(bar).toBeVisible();
    await bar.getByRole("button", { name: "Stop this chain" }).click();
    await expect(bar).toBeHidden();
  });
});
