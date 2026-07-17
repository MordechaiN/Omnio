import { Controller, Inject, Req, Res } from "@nestjs/common";
import { TsRestHandler, tsRestHandler } from "@ts-rest/nest";
import { apiContract } from "@omnio/contracts";
import type { Request, Response } from "express";
import { OMNIO_ENV } from "../config/config.module";
import type { Env } from "../env";
import { AuthService } from "./auth.service";
import { clearSessionCookie, readSessionCookie, serializeSessionCookie } from "./cookies";
import { RateLimit } from "../security/rate-limit.decorator";
import { CurrentUser } from "./current-user.decorator";
import { Public } from "./public.decorator";
import type { AuthedUser } from "./types";

const c = apiContract.auth;

@RateLimit("auth")
@Controller()
export class AuthController {
  private readonly secureCookies: boolean;
  private readonly sessionMaxAgeSeconds: number;

  constructor(
    @Inject(OMNIO_ENV) env: Env,
    private readonly auth: AuthService,
  ) {
    this.secureCookies = env.NODE_ENV === "production";
    this.sessionMaxAgeSeconds = env.OMNIO_SESSION_TTL_HOURS * 3600;
  }

  @Public()
  @TsRestHandler(c.status)
  status(@Req() req: Request) {
    return tsRestHandler(c.status, async () => {
      const token = readSessionCookie(req.headers.cookie);
      const user = this.auth.isEnabled && token ? await this.auth.resolveSession(token) : null;
      return { status: 200 as const, body: await this.auth.status(user) };
    });
  }

  @Public()
  @TsRestHandler(c.setup)
  setup(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    return tsRestHandler(c.setup, async ({ body }) => {
      const identity = await this.auth.setup(body.username, body.password);
      const user = await this.auth.login(body.username, body.password);
      await this.openSession(res, req, user);
      return { status: 201 as const, body: identity };
    });
  }

  @Public()
  @TsRestHandler(c.login)
  login(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    return tsRestHandler(c.login, async ({ body }) => {
      const user = await this.auth.login(body.username, body.password);
      await this.openSession(res, req, user);
      return { status: 200 as const, body: { username: user.username } };
    });
  }

  @TsRestHandler(c.logout)
  logout(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    return tsRestHandler(c.logout, async () => {
      const token = readSessionCookie(req.headers.cookie);
      if (token) await this.auth.revokeSession(token);
      res.setHeader("Set-Cookie", clearSessionCookie({ secure: this.secureCookies }));
      return { status: 204 as const, body: undefined };
    });
  }

  @TsRestHandler(c.me)
  me(@CurrentUser() user: AuthedUser) {
    return tsRestHandler(c.me, async () => ({
      status: 200 as const,
      body: { username: user.username },
    }));
  }

  private async openSession(res: Response, req: Request, user: AuthedUser): Promise<void> {
    const { token } = await this.auth.issueSession(user.id, {
      userAgent: req.headers["user-agent"],
      ip: req.ip,
    });
    res.setHeader(
      "Set-Cookie",
      serializeSessionCookie(token, this.sessionMaxAgeSeconds, { secure: this.secureCookies }),
    );
  }
}
