import type { DynamicModule } from "@nestjs/common";
import { Module } from "@nestjs/common";
import { LoggerModule } from "nestjs-pino";
import { AuthModule } from "./auth/auth.module";
import { ConfigModule, OMNIO_ENV } from "./config/config.module";
import type { Env } from "./env";
import { FilesModule } from "./files/files.module";
import { HealthController } from "./health/health.controller";
import { PrismaModule } from "./infra/prisma.module";
import { RedisModule } from "./infra/redis.module";
import { loggerParams } from "./observability/logger";
import { MetricsModule } from "./observability/metrics.module";
import { SecurityModule } from "./security/security.module";
import { StorageModule } from "./storage/storage.module";
import { SystemController } from "./system/system.controller";
import { SystemService } from "./system/system.service";

@Module({})
export class AppModule {
  static forRoot(env: Env): DynamicModule {
    return {
      module: AppModule,
      imports: [
        ConfigModule.forRoot(env),
        LoggerModule.forRootAsync({
          inject: [OMNIO_ENV],
          useFactory: (resolved: Env) => loggerParams(resolved),
        }),
        PrismaModule,
        RedisModule,
        MetricsModule,
        SecurityModule,
        AuthModule,
        StorageModule,
        FilesModule,
      ],
      controllers: [HealthController, SystemController],
      providers: [SystemService],
    };
  }
}
