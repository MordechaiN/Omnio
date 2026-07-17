import type { PrismaClient } from "@omnio/db";
import type { StorageDriver } from "@omnio/storage";
import type { Logger } from "pino";

export interface SweeperDeps {
  prisma: PrismaClient;
  storage: StorageDriver;
  logger: Logger;
}

const BATCH_SIZE = 500;
const MAX_BATCHES = 1000;

/**
 * Delete scratch objects whose TTL has passed, storage bytes first then the DB
 * row (docs/architecture/06-security.md §3). A storage delete that fails is
 * logged as an orphan but never blocks reclaiming the row — the object is
 * unreachable regardless, and a re-run or manual sweep can retry it.
 */
export async function sweepExpired(deps: SweeperDeps, now: Date = new Date()): Promise<number> {
  let swept = 0;
  for (let batch = 0; batch < MAX_BATCHES; batch += 1) {
    const expired = await deps.prisma.fileObject.findMany({
      where: { area: "scratch", ttlAt: { lte: now } },
      take: BATCH_SIZE,
    });
    if (expired.length === 0) break;

    for (const file of expired) {
      try {
        await deps.storage.delete(file.area, file.driverKey);
      } catch (error) {
        deps.logger.warn(
          { fileId: file.id, driverKey: file.driverKey, err: String(error) },
          "orphaned scratch object; deleting row anyway",
        );
      }
      await deps.prisma.fileObject.delete({ where: { id: file.id } }).catch(() => undefined);
      swept += 1;
    }
    if (expired.length < BATCH_SIZE) break;
  }
  if (swept > 0) deps.logger.info({ swept }, "scratch sweep complete");
  return swept;
}

/** BullMQ processor for the repeatable maintenance sweep. */
export function createSweepProcessor(deps: SweeperDeps) {
  return async (): Promise<void> => {
    await sweepExpired(deps);
  };
}
