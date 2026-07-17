import { Controller } from "@nestjs/common";
import { TsRestHandler, tsRestHandler } from "@ts-rest/nest";
import { apiContract } from "@omnio/contracts";
import { CurrentUser } from "../auth/current-user.decorator";
import type { AuthedUser } from "../auth/types";
import { RateLimit } from "../security/rate-limit.decorator";
import { toFileDto } from "./file-serializer";
import { FilesService } from "./files.service";

const c = apiContract.files;

@Controller()
export class FilesController {
  constructor(private readonly files: FilesService) {}

  @TsRestHandler(c.list)
  list(@CurrentUser() user: AuthedUser) {
    return tsRestHandler(c.list, async ({ query }) => {
      const files = await this.files.list(user.id, query.area);
      return { status: 200 as const, body: { files: files.map(toFileDto) } };
    });
  }

  @TsRestHandler(c.get)
  get(@CurrentUser() user: AuthedUser) {
    return tsRestHandler(c.get, async ({ params }) => ({
      status: 200 as const,
      body: toFileDto(await this.files.get(user.id, params.id)),
    }));
  }

  @RateLimit("mutation")
  @TsRestHandler(c.keep)
  keep(@CurrentUser() user: AuthedUser) {
    return tsRestHandler(c.keep, async ({ params }) => ({
      status: 200 as const,
      body: toFileDto(await this.files.keep(user.id, params.id)),
    }));
  }

  @RateLimit("mutation")
  @TsRestHandler(c.remove)
  remove(@CurrentUser() user: AuthedUser) {
    return tsRestHandler(c.remove, async ({ params }) => {
      await this.files.remove(user.id, params.id);
      return { status: 204 as const, body: undefined };
    });
  }
}
