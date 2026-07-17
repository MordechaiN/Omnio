import { expect, mockJson, test } from "./fixtures";

const CORS = {
  "access-control-allow-origin": "http://localhost:3000",
  "access-control-allow-credentials": "true",
};

const FILE = { name: "notes.txt", mimeType: "text/plain", buffer: Buffer.from("hello omnio") };

function uploadedFile(id: string) {
  return {
    id,
    area: "scratch",
    mime: "text/plain",
    size: 11,
    originalName: FILE.name,
    createdAt: new Date().toISOString(),
    ttlAt: null,
  };
}

function job(overrides: Record<string, unknown>) {
  return {
    id: "job1",
    moduleId: "case",
    toolId: "uppercase",
    status: "queued",
    progress: 0,
    error: null,
    inputs: ["file1"],
    outputs: [],
    createdAt: new Date().toISOString(),
    startedAt: null,
    finishedAt: null,
    ...overrides,
  };
}

test.describe("job runtime", () => {
  test("running a worker tool streams to a downloadable result", async ({ page }) => {
    await mockJson(page, "**/api/v1/files", 201, uploadedFile("file1"));
    await mockJson(page, "**/api/v1/jobs", 201, job({ status: "active", progress: 10 }));
    await mockJson(
      page,
      "**/api/v1/jobs/job1",
      200,
      job({ status: "completed", progress: 100, outputs: ["out1"] }),
    );
    // Live progress: an active tick, then a terminal completed event.
    await page.route("**/api/v1/jobs/job1/events", (route) =>
      route.fulfill({
        status: 200,
        headers: { ...CORS, "content-type": "text/event-stream" },
        body:
          `data: {"jobId":"job1","status":"active","progress":60,"error":null}\n\n` +
          `data: {"jobId":"job1","status":"completed","progress":100,"error":null}\n\n`,
      }),
    );

    await page.goto("/tool/case/uppercase");
    await page.locator('input[type="file"]').setInputFiles(FILE);

    // The tray opens itself and the run resolves to a download.
    const download = page.getByRole("link", { name: "Download" });
    await expect(download).toBeVisible();
    await expect(download).toHaveAttribute("href", /\/api\/v1\/files\/out1\/content$/);
  });

  test("an upload failure shows a failed run", async ({ page }) => {
    await page.route("**/api/v1/files", (route) =>
      route.fulfill({
        status: 400,
        headers: { ...CORS, "content-type": "application/json" },
        body: JSON.stringify({ code: "invalid_file", message: "That file type isn't supported." }),
      }),
    );

    await page.goto("/tool/case/uppercase");
    await page.locator('input[type="file"]').setInputFiles(FILE);

    await expect(page.getByText("That file type isn't supported.")).toBeVisible();
  });
});
