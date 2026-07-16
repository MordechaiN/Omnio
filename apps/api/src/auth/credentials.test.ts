import { describe, expect, it } from "vitest";
import { generateSessionToken, hashPassword, hashToken, verifyPassword } from "./credentials";

describe("password hashing", () => {
  it("verifies a correct password and rejects a wrong one", async () => {
    const digest = await hashPassword("correct horse battery staple");
    expect(digest).toMatch(/^\$argon2id\$/);
    expect(await verifyPassword(digest, "correct horse battery staple")).toBe(true);
    expect(await verifyPassword(digest, "wrong")).toBe(false);
  });

  it("returns false instead of throwing on a malformed digest", async () => {
    expect(await verifyPassword("not-a-hash", "whatever")).toBe(false);
  });
});

describe("session tokens", () => {
  it("hashes tokens deterministically", () => {
    expect(hashToken("abc")).toBe(hashToken("abc"));
    expect(hashToken("abc")).not.toBe(hashToken("abd"));
  });

  it("generates unique url-safe tokens", () => {
    const a = generateSessionToken();
    const b = generateSessionToken();
    expect(a).not.toBe(b);
    expect(a).toMatch(/^[A-Za-z0-9_-]+$/);
  });
});
