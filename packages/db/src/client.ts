import { PrismaClient } from "../generated/prisma";

export interface PrismaClientOptions {
  databaseUrl: string;
  /** Emit query logs. Development only — queries can carry user data. */
  logQueries?: boolean;
}

/**
 * Single construction point for the Prisma client so connection options and
 * log configuration never drift between api and worker.
 */
export function createPrismaClient(options: PrismaClientOptions): PrismaClient {
  return new PrismaClient({
    datasourceUrl: options.databaseUrl,
    log: options.logQueries ? ["query", "warn", "error"] : ["warn", "error"],
  });
}
