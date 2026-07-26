import { expect, test } from "./fixtures";

/**
 * Omnio's claim is that everything runs in your browser. That claim has to
 * survive the server being unavailable — during a restart, on a train, or on a
 * laptop that wandered off the network. An unreachable api used to replace the
 * whole application with a retry screen, taking 121 browser-tier tools down
 * with a server they never used.
 *
 * `personal` is the default deployment and has no login at all, so there the
 * gate was protecting nothing whatsoever.
 */
test.describe("working without the server", () => {
  test.beforeEach(async ({ page }) => {
    // The fixture normally answers auth/status; here the server simply is not there.
    await page.route("**/api/v1/**", (route) => route.abort("connectionrefused"));
  });

  test("offers a way through, and the on-device tools still work", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByText("Can't reach the server")).toBeVisible();

    await page.getByRole("button", { name: "Continue without the server" }).click();

    // The app itself, not a retry screen.
    await expect(page.getByRole("heading", { name: "Drop any file to get started" })).toBeVisible();

    // A browser-tier tool is fully usable.
    await page.goto("/tool/imagekit/image-compress");
    await expect(page.getByRole("heading", { level: 1, name: "Image Compressor" })).toBeVisible();

    // And the choice survives navigation rather than throwing you back out.
    await expect(page.getByRole("status").first()).toBeVisible();
  });

  test("a server-tier tool says so instead of offering a doomed upload", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("button", { name: "Continue without the server" }).click();

    await page.goto("/tool/officekit/office-to-pdf");
    await expect(page.getByText("This tool needs the server")).toBeVisible();
    await expect(page.getByRole("button", { name: /Choose a file/i })).toBeHidden();
  });
});
