import { Controller, Get, Inject } from "@nestjs/common";
import { Public } from "../auth/public.decorator";
import { readBuildInfo, type BuildInfo } from "../build-info";
import { OMNIO_ENV } from "../config/config.module";
import type { Env } from "../env";

/**
 * `GET /api/version` — always describes the running deployment. Deliberately
 * outside the ts-rest product contract and unauthenticated: it is deployment
 * metadata (like /healthz), consumed by the web About page, the footer, and the
 * release-verification tooling to confirm Oracle and GitHub report the same
 * build (docs/architecture/09-releases.md).
 */
@Public()
@Controller("api")
export class VersionController {
  constructor(@Inject(OMNIO_ENV) private readonly env: Env) {}

  @Get("version")
  version(): BuildInfo {
    return readBuildInfo(this.env);
  }
}
