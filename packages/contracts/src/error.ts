import { z } from "zod";

/**
 * The single error envelope for the whole API. `code` is a stable machine
 * token (e.g. `already_setup`, `invalid_credentials`); `message` is a
 * human-readable, i18n-key-friendly summary that never echoes raw input.
 */
export const ErrorSchema = z.object({
  code: z.string(),
  message: z.string(),
});
export type ApiError = z.infer<typeof ErrorSchema>;
