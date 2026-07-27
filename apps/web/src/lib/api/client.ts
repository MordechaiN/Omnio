import { apiContract } from "@omnio/contracts";
import { initClient } from "@ts-rest/core";

/** Base URL of the API. Shared by the typed client and the raw binary routes. */
export const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:7410";

/**
 * The typed API client — one source of truth shared with the backend via
 * @omnio/contracts. Cookies ride along (`credentials: "include"`) so the
 * session works whether the web and api share an origin or not.
 */
export const apiClient = initClient(apiContract, {
  baseUrl: API_BASE_URL,
  baseHeaders: {},
  credentials: "include",
});
