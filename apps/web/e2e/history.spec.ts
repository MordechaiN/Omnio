import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "./fixtures";

const CORS = {
  "content-type": "application/json",
  "access-control-allow-origin": "http://localhost:3000",
  "access-control-allow-credentials": "true",
};

/** Matches the list route (`/api/v1/jobs` ± query) but not `/api/v1/jobs/:id`. */
const JOBS_LIST = /\/api\/v1\/jobs(\?.*)?$/;

function job(overrides: Record<string, unknown>) {
  return {
    id: "job1",
    moduleId: "case",
    toolId: "uppercase",
    status: "completed",
    progress: 100,
    error: null,
    inputs: ["file1"],
    outputs: [],
    createdAt: "2026-07-01T10:00:00.000Z",
    startedAt: "2026-07-01T10:00:01.000Z",
    finishedAt: "2026-07-01T10:00:05.000Z",
    ...overrides,
  };
}

test.describe("history", () => {
  test("lists past runs with status and a download", async ({ page }) => {
    await page.route(JOBS_LIST, (route) =>
      route.fulfill({
        status: 200,
        headers: CORS,
        body: JSON.stringify({
          jobs: [
            job({ id: "job1", status: "completed", outputs: ["out1"] }),
            job({ id: "job2", status: "failed", error: "The tool ran out of memory." }),
          ],
        }),
      }),
    );

    await page.goto("/history");

    await expect(page.getByRole("heading", { name: "History" })).toBeVisible();
    await expect(page.getByText("Uppercase").first()).toBeVisible();
    await expect(page.getByText("Done")).toBeVisible();
    await expect(page.getByText("Failed")).toBeVisible();
    await expect(page.getByText("The tool ran out of memory.")).toBeVisible();

    const download = page.getByRole("link", { name: "Download" });
    await expect(download).toHaveAttribute("href", /\/api\/v1\/files\/out1\/content$/);

    const results = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa"]).analyze();
    const serious = results.violations.filter(
      (v) => v.impact === "serious" || v.impact === "critical",
    );
    expect(serious, serious.map((v) => v.id).join("\n")).toEqual([]);
  });

  test("shows an empty state with nothing to show", async ({ page }) => {
    await page.route(JOBS_LIST, (route) =>
      route.fulfill({ status: 200, headers: CORS, body: JSON.stringify({ jobs: [] }) }),
    );

    await page.goto("/history");
    await expect(page.getByText("Nothing here yet")).toBeVisible();
  });
});
