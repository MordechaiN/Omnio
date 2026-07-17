import { Controller } from "@nestjs/common";
import { TsRestHandler, tsRestHandler } from "@ts-rest/nest";
import { apiContract } from "@omnio/contracts";
import { AnalyticsService } from "./analytics.service";

const c = apiContract.analytics;

@Controller()
export class AnalyticsController {
  constructor(private readonly analytics: AnalyticsService) {}

  @TsRestHandler(c.record)
  record() {
    return tsRestHandler(c.record, async ({ body }) => {
      await this.analytics.record(body);
      return { status: 204 as const, body: undefined };
    });
  }
}
