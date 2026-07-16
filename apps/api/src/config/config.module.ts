import type { DynamicModule } from "@nestjs/common";
import { Global, Module } from "@nestjs/common";
import type { Env } from "../env";

/** DI token for the validated, immutable boot configuration. */
export const OMNIO_ENV = "OMNIO_ENV";

/**
 * Makes the already-validated {@link Env} available everywhere via DI. Config
 * is parsed once in `main.ts` (so an invalid environment refuses startup before
 * Nest is constructed) and injected as a value — never re-read from
 * `process.env` deeper in the app.
 */
@Global()
@Module({})
export class ConfigModule {
  static forRoot(env: Env): DynamicModule {
    return {
      module: ConfigModule,
      providers: [{ provide: OMNIO_ENV, useValue: env }],
      exports: [OMNIO_ENV],
    };
  }
}
