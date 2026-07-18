import { test as base, expect, type Page } from "@playwright/test";

const CORS = {
  "content-type": "application/json",
  "access-control-allow-origin": "http://localhost:3000",
  "access-control-allow-credentials": "true",
};

/** Fulfil an API route with the CORS headers the credentialed client requires. */
export async function mockJson(page: Page, url: string, status: number, body: unknown) {
  await page.route(url, (route) =>
    route.fulfill({ status, headers: CORS, body: JSON.stringify(body) }),
  );
}

const AUTHENTICATED = { needsSetup: false, authenticated: true, username: "admin" };

/**
 * Navigate and wait for the app shell to hydrate behind the auth gate. The gate
 * renders a splash until the client resolves the (mocked) auth status, so any
 * spec that drives the keyboard must wait for the shell before pressing keys.
 */
export async function gotoApp(page: Page, path = "/") {
  await page.goto(path);
  // The search trigger lives in the sidebar on desktop and the top bar on
  // mobile — different visible placeholder text, same stable accessible name.
  await expect(page.getByRole("button", { name: "Search" }).first()).toBeVisible();
}

/**
 * Default test context: the API reports an authenticated session, so specs that
 * exercise the workspace behind the auth gate see the app, not the login screen.
 * Auth-flow specs override the route themselves.
 */
export const test = base.extend({
  page: async ({ page }, use) => {
    await mockJson(page, "**/api/v1/auth/status", 200, AUTHENTICATED);
    await use(page);
  },
});

export { expect };
