import { Injectable } from "@nestjs/common";
import type { SystemInfo } from "@omnio/contracts";
import { OMNIO_VERSION } from "../version";

@Injectable()
export class SystemService {
  getInfo(): SystemInfo {
    return {
      name: "omnio",
      version: OMNIO_VERSION,
      uptimeSec: process.uptime(),
    };
  }
}
