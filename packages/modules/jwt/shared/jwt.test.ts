import { describe, expect, it } from "vitest";
import { decodeJwt } from "./jwt.ts";

// HS256 token: {alg:HS256,typ:JWT} / {sub:"1234567890",name:"John Doe",iat:1516239022}
const SAMPLE =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9" +
  ".eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ" +
  ".SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c";

describe("decodeJwt", () => {
  it("decodes header and payload", () => {
    const r = decodeJwt(SAMPLE);
    expect(r.ok).toBe(true);
    expect(r.header).toEqual({ alg: "HS256", typ: "JWT" });
    expect(r.payload).toMatchObject({ sub: "1234567890", name: "John Doe" });
  });

  it("renders iat as an ISO date", () => {
    const iat = decodeJwt(SAMPLE).claims?.find((c) => c.key === "iat");
    expect(iat?.date).toBe("2018-01-18T01:30:22.000Z");
  });

  it("flags an expired exp claim", () => {
    // {exp: 1000000000} → year 2001, always in the past.
    const token = `eyJhbGciOiJIUzI1NiJ9.${btoa('{"exp":1000000000}')
      .replace(/=/g, "")
      .replace(/\+/g, "-")
      .replace(/\//g, "_")}.sig`;
    const exp = decodeJwt(token).claims?.find((c) => c.key === "exp");
    expect(exp?.expired).toBe(true);
  });

  it("rejects a token without three segments", () => {
    expect(decodeJwt("a.b").ok).toBe(false);
  });

  it("rejects non-JSON segments", () => {
    expect(decodeJwt("notbase64.notbase64.sig").ok).toBe(false);
  });

  it("treats empty input as neutral", () => {
    expect(decodeJwt("   ")).toEqual({ ok: true });
  });
});
