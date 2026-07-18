import { Inject, Injectable } from "@nestjs/common";
import type { SystemInfo } from "@omnio/contracts";
import { readManifest } from "../build-info";
import { OMNIO_ENV } from "../config/config.module";
import type { Env } from "../env";

@Injectable()
export class SystemService {
  constructor(@Inject(OMNIO_ENV) private readonly env: Env) {}

  getInfo(): SystemInfo {
    return {
      name: "omnio",
      version: readManifest(this.env).version,
      uptimeSec: process.uptime(),
    };
  }
}
