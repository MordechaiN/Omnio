import { Controller } from "@nestjs/common";
import { TsRestHandler, tsRestHandler } from "@ts-rest/nest";
import { apiContract } from "@omnio/contracts";
import { CurrentUser } from "../auth/current-user.decorator";
import type { AuthedUser } from "../auth/types";
import { RateLimit } from "../security/rate-limit.decorator";
import { toJobDto } from "./job-serializer";
import { JobsService } from "./jobs.service";

const c = apiContract.jobs;

@Controller()
export class JobsController {
  constructor(private readonly jobs: JobsService) {}

  @RateLimit("mutation")
  @TsRestHandler(c.create)
  create(@CurrentUser() user: AuthedUser) {
    return tsRestHandler(c.create, async ({ body }) => ({
      status: 201 as const,
      body: toJobDto(await this.jobs.create(user.id, body)),
    }));
  }

  @TsRestHandler(c.list)
  list(@CurrentUser() user: AuthedUser) {
    return tsRestHandler(c.list, async ({ query }) => ({
      status: 200 as const,
      body: { jobs: (await this.jobs.list(user.id, query.limit)).map(toJobDto) },
    }));
  }

  @TsRestHandler(c.get)
  get(@CurrentUser() user: AuthedUser) {
    return tsRestHandler(c.get, async ({ params }) => ({
      status: 200 as const,
      body: toJobDto(await this.jobs.get(user.id, params.id)),
    }));
  }
}
