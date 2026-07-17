import { ulid } from "ulid";

/** Crockford base32, exactly 26 chars — the ULID alphabet. */
const KEY_PATTERN = /^[0-9A-HJKMNP-TV-Z]{26}$/;

export function generateObjectKey(): string {
  return ulid();
}

/**
 * Keys are always machine-generated, but every driver validates the shape
 * before touching the filesystem — a defence-in-depth guard against path
 * traversal if a key ever reaches the driver from an untrusted source.
 */
export function isValidObjectKey(key: string): boolean {
  return KEY_PATTERN.test(key);
}
