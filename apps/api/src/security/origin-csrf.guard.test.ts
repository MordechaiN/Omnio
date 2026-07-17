import type { ExecutionContext } from "@nestjs/common";
import { describe, expect, it } from "vitest";
import type { Env } from "../env";
import { OriginCsrfGuard } from "./origin-csrf.guard";

function guard(allowed: string[]): OriginCsrfGuard {
  return new OriginCsrfGuard({ OMNIO_ALLOWED_ORIGINS: allowed } as Env);
}

function context(req: {
  method: string;
  headers: Record<string, string | undefined>;
}): ExecutionContext {
  return {
    switchToHttp: () => ({ getRequest: () => req }),
  } as unknown as ExecutionContext;
}

describe("OriginCsrfGuard", () => {
  it("allows safe methods without an Origin", () => {
    expect(guard([]).canActivate(context({ method: "GET", headers: {} }))).toBe(true);
  });

  it("allows a same-origin mutation", () => {
    const ctx = context({
      method: "POST",
      headers: { origin: "https://omnio.example", host: "omnio.example" },
    });
    expect(guard([]).canActivate(ctx)).toBe(true);
  });

  it("rejects a cross-origin mutation", () => {
    const ctx = context({
      method: "POST",
      headers: { origin: "https://evil.example", host: "omnio.example" },
    });
    expect(() => guard([]).canActivate(ctx)).toThrow(/Cross-origin/);
  });

  it("rejects a mutation with no Origin header", () => {
    const ctx = context({ method: "DELETE", headers: { host: "omnio.example" } });
    expect(() => guard([]).canActivate(ctx)).toThrow(/Cross-origin/);
  });

  it("allows an explicitly allow-listed origin", () => {
    const ctx = context({
      method: "POST",
      headers: { origin: "https://app.example", host: "api.example" },
    });
    expect(guard(["https://app.example"]).canActivate(ctx)).toBe(true);
  });
});
