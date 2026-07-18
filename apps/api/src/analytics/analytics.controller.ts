import { Controller } from "@nestjs/common";
import { TsRestHandler, tsRestHandler } from "@ts-rest/nest";
import { apiContract } from "@omnio/contracts";
import { Public } from "../auth/public.decorator";
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

  // Read-only, anonymous, instance-wide aggregates — same "public GET,
  // authenticated mutation" split as /api/version vs the record endpoint above.
  @Public()
  @TsRestHandler(c.stats)
  stats() {
    return tsRestHandler(c.stats, async () => ({
      status: 200 as const,
      body: await this.analytics.stats(),
    }));
  }
}
