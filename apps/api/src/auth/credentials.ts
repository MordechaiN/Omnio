import { createHash, randomBytes } from "node:crypto";
import { hash as argonHash, verify as argonVerify } from "@node-rs/argon2";

/**
 * Argon2id password hashing (docs/architecture/06-security.md §4). @node-rs/argon2
 * defaults to Argon2id with OWASP-aligned cost; verification is constant-time.
 */
export function hashPassword(password: string): Promise<string> {
  return argonHash(password);
}

export function verifyPassword(digest: string, password: string): Promise<boolean> {
  return argonVerify(digest, password).catch(() => false);
}

/** Opaque session token; only its SHA-256 is persisted. */
export function generateSessionToken(): string {
  return randomBytes(32).toString("base64url");
}

export function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}
