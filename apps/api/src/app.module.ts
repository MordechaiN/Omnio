import { Module } from "@nestjs/common";
import { HealthController } from "./health/health.controller";
import { SystemController } from "./system/system.controller";
import { SystemService } from "./system/system.service";

@Module({
  controllers: [HealthController, SystemController],
  providers: [SystemService],
})
export class AppModule {}
