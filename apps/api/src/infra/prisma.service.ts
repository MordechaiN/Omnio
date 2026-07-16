import type { OnModuleDestroy, OnModuleInit } from "@nestjs/common";
import { Inject, Injectable } from "@nestjs/common";
import { PrismaClient } from "@omnio/db";
import { OMNIO_ENV } from "../config/config.module";
import type { Env } from "../env";

/**
 * The single Prisma connection for the api process. Migrations are applied at
 * boot in `main.ts` before this connects (docs/architecture/01-system-overview.md §7).
 */
@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  constructor(@Inject(OMNIO_ENV) env: Env) {
    super({ datasourceUrl: env.OMNIO_DATABASE_URL, log: ["warn", "error"] });
  }

  async onModuleInit(): Promise<void> {
    await this.$connect();
  }

  async onModuleDestroy(): Promise<void> {
    await this.$disconnect();
  }
}
