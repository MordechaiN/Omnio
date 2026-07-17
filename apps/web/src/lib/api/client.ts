import { apiContract } from "@omnio/contracts";
import { initClient } from "@ts-rest/core";

/**
 * The typed API client — one source of truth shared with the backend via
 * @omnio/contracts. Cookies ride along (`credentials: "include"`) so the
 * session works whether the web and api share an origin or not.
 */
export const apiClient = initClient(apiContract, {
  baseUrl: process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000",
  baseHeaders: {},
  credentials: "include",
});
