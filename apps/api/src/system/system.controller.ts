import { Controller } from "@nestjs/common";
import { TsRestHandler, tsRestHandler } from "@ts-rest/nest";
import { apiContract } from "@omnio/contracts";
import { Public } from "../auth/public.decorator";
import { SystemService } from "./system.service";

@Public()
@Controller()
export class SystemController {
  constructor(private readonly systemService: SystemService) {}

  @TsRestHandler(apiContract.system.getInfo)
  getInfo() {
    return tsRestHandler(apiContract.system.getInfo, async () => ({
      status: 200 as const,
      body: this.systemService.getInfo(),
    }));
  }
}
