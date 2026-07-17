import { Global, Module } from "@nestjs/common";
import { createStorageDriver, type StorageDriver } from "@omnio/storage";
import { OMNIO_ENV } from "../config/config.module";
import type { Env } from "../env";

/** DI token for the configured {@link StorageDriver}. */
export const STORAGE_DRIVER = "STORAGE_DRIVER";

@Global()
@Module({
  providers: [
    {
      provide: STORAGE_DRIVER,
      inject: [OMNIO_ENV],
      useFactory: (env: Env): StorageDriver =>
        createStorageDriver({ root: env.OMNIO_STORAGE_ROOT }),
    },
  ],
  exports: [STORAGE_DRIVER],
})
export class StorageModule {}
