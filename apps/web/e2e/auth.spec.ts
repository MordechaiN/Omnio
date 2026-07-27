import { test as base, expect, type Page } from "@playwright/test";

const CORS = {
  "content-type": "application/json",
  "access-control-allow-origin": "http://localhost:7400",
  "access-control-allow-credentials": "true",
};

function status(page: Page, body: unknown) {
  return page.route("**/api/v1/auth/status", (route) =>
    route.fulfill({ status: 200, headers: CORS, body: JSON.stringify(body) }),
  );
}

base.describe("authentication — personal mode (default)", () => {
  base("skips straight to the workspace, no login UI", async ({ page }) => {
    await status(page, { mode: "personal", needsSetup: false, authenticated: true, username: "admin" });
    await page.goto("/");
    await expect(page.getByRole("heading", { name: "Categories" })).toBeVisible();
    await expect(page.getByLabel("Account")).not.toBeVisible();
  });
});

base.describe("authentication — multi-user mode", () => {
  base("first run shows the setup screen", async ({ page }) => {
    await status(page, { mode: "multi-user", needsSetup: true, authenticated: false, username: null });
    await page.goto("/");
    await expect(page.getByRole("heading", { name: "Welcome to Omnio" })).toBeVisible();
    await expect(page.getByLabel("Password")).toBeVisible();
  });

  base("returning visitor sees the login screen", async ({ page }) => {
    await status(page, { mode: "multi-user", needsSetup: false, authenticated: false, username: null });
    await page.goto("/");
    await expect(page.getByRole("heading", { name: "Welcome back" })).toBeVisible();
  });

  base("an unreachable API shows an offline state", async ({ page }) => {
    await page.route("**/api/v1/auth/status", (route) => route.abort());
    await page.goto("/");
    await expect(page.getByRole("heading", { name: "Can't reach the server" })).toBeVisible();
  });

  base("signing in reveals the workspace", async ({ page }) => {
    let authenticated = false;
    await page.route("**/api/v1/auth/status", (route) =>
      route.fulfill({
        status: 200,
        headers: CORS,
        body: JSON.stringify({
          mode: "multi-user",
          needsSetup: false,
          authenticated,
          username: authenticated ? "admin" : null,
        }),
      }),
    );
    await page.route("**/api/v1/auth/login", (route) => {
      authenticated = true;
      return route.fulfill({
        status: 200,
        headers: CORS,
        body: JSON.stringify({ username: "admin" }),
      });
    });

    await page.goto("/");
    await page.getByLabel("Username").fill("admin");
    await page.getByLabel("Password").fill("correct horse battery staple");
    await page.getByRole("button", { name: "Sign in" }).click();

    await expect(page.getByRole("heading", { name: "Categories" })).toBeVisible();
  });
});
