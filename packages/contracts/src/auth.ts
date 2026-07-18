import { initContract } from "@ts-rest/core";
import { z } from "zod";
import { ErrorSchema } from "./error.js";

const c = initContract();

export const UsernameSchema = z
  .string()
  .trim()
  .min(1)
  .max(64)
  .regex(/^[a-zA-Z0-9._-]+$/, "letters, digits, dot, underscore, and hyphen only");

/** Admin passwords: long over complex. Enforced on setup and change. */
export const PasswordSchema = z.string().min(12).max(256);

export const DeploymentModeSchema = z.enum(["personal", "multi-user"]);
export type DeploymentMode = z.infer<typeof DeploymentModeSchema>;

export const AuthStatusSchema = z.object({
  mode: DeploymentModeSchema,
  /** No admin exists yet — the first-run setup screen should be shown. Always false in personal mode. */
  needsSetup: z.boolean(),
  authenticated: z.boolean(),
  username: z.string().nullable(),
});
export type AuthStatus = z.infer<typeof AuthStatusSchema>;

export const IdentitySchema = z.object({
  username: z.string(),
});
export type Identity = z.infer<typeof IdentitySchema>;

export const authContract = c.router(
  {
    status: {
      method: "GET",
      path: "/api/v1/auth/status",
      responses: { 200: AuthStatusSchema },
      summary: "First-run and authentication state",
    },
    setup: {
      method: "POST",
      path: "/api/v1/auth/setup",
      body: z.object({ username: UsernameSchema, password: PasswordSchema }),
      responses: { 201: IdentitySchema, 409: ErrorSchema },
      summary: "Create the single admin account (first run only)",
    },
    login: {
      method: "POST",
      path: "/api/v1/auth/login",
      body: z.object({ username: UsernameSchema, password: z.string().min(1) }),
      responses: { 200: IdentitySchema, 401: ErrorSchema },
      summary: "Authenticate and open a session",
    },
    logout: {
      method: "POST",
      path: "/api/v1/auth/logout",
      body: z.void(),
      responses: { 204: z.void() },
      summary: "Revoke the current session",
    },
    me: {
      method: "GET",
      path: "/api/v1/auth/me",
      responses: { 200: IdentitySchema, 401: ErrorSchema },
      summary: "The authenticated identity",
    },
  },
  { strictStatusCodes: true },
);
