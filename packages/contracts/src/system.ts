import { initContract } from "@ts-rest/core";
import { z } from "zod";

const c = initContract();

export const SystemInfoSchema = z.object({
  name: z.literal("omnio"),
  version: z.string(),
  /** Seconds since the API process started. */
  uptimeSec: z.number().nonnegative(),
});

export type SystemInfo = z.infer<typeof SystemInfoSchema>;

export const systemContract = c.router({
  getInfo: {
    method: "GET",
    path: "/api/v1/system/info",
    responses: {
      200: SystemInfoSchema,
    },
    summary: "Instance identity and liveness metadata",
  },
});
