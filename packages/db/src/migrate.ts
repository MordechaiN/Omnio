import { execFile } from "node:child_process";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);
const cjsRequire = createRequire(__filename);

/** Absolute path to the packaged Prisma schema (shipped via package `files`). */
export const PRISMA_SCHEMA_PATH = join(__dirname, "..", "prisma", "schema.prisma");

export interface MigrateOptions {
  databaseUrl: string;
  /** Override the schema location (tests point at a fixture DB). */
  schemaPath?: string;
}

function resolvePrismaCli(): string {
  const packageJsonPath = cjsRequire.resolve("prisma/package.json");
  const pkg = cjsRequire(packageJsonPath) as { bin?: string | { prisma?: string } };
  const binRelative = typeof pkg.bin === "string" ? pkg.bin : pkg.bin?.prisma;
  if (!binRelative) {
    throw new Error("Unable to locate the prisma CLI entry point.");
  }
  return join(dirname(packageJsonPath), binRelative);
}

/**
 * Apply pending migrations. Prisma's `migrate deploy` takes a Postgres advisory
 * lock for the duration, so running this on every api boot is safe with
 * multiple replicas (docs/architecture/01-system-overview.md §7).
 */
export async function deployMigrations(options: MigrateOptions): Promise<void> {
  const schema = options.schemaPath ?? PRISMA_SCHEMA_PATH;
  await execFileAsync(
    process.execPath,
    [resolvePrismaCli(), "migrate", "deploy", "--schema", schema],
    { env: { ...process.env, OMNIO_DATABASE_URL: options.databaseUrl } },
  );
}
