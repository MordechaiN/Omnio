import { Module } from "@nestjs/common";
import { JobsEventsController } from "./jobs-events.controller";
import { JobsController } from "./jobs.controller";
import { JobsService } from "./jobs.service";
import { JobQueue } from "./job-queue";
import { MaintenanceScheduler } from "./maintenance.scheduler";

@Module({
  controllers: [JobsController, JobsEventsController],
  providers: [JobsService, JobQueue, MaintenanceScheduler],
})
export class JobsModule {}
