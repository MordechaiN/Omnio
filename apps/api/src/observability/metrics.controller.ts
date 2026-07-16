import { Controller, Get, Header, Res } from "@nestjs/common";
import type { Response } from "express";
import { MetricsService } from "./metrics.service";

/**
 * Prometheus scrape endpoint — deployment surface, intentionally outside the
 * public ts-rest contract (docs/architecture/01-system-overview.md §7).
 */
@Controller()
export class MetricsController {
  constructor(private readonly metrics: MetricsService) {}

  @Get("metrics")
  @Header("Cache-Control", "no-store")
  async scrape(@Res() res: Response): Promise<void> {
    res.setHeader("Content-Type", this.metrics.contentType);
    res.send(await this.metrics.render());
  }
}
