import { initContract } from "@ts-rest/core";
import { systemContract } from "./system.js";

const c = initContract();

/**
 * The complete public API surface. Every domain router mounts here;
 * apps/api implements this contract and apps/web consumes it — nothing
 * else defines routes (docs/architecture/01-system-overview.md §6).
 */
export const apiContract = c.router({
  system: systemContract,
});
