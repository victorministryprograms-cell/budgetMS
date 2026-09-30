import fs from "node:fs";
import path from "node:path";
import { createClient, type Client } from "@libsql/client";
import { withRetry } from "./retry";

/**
 * Applies the SQL files under prisma/migrations to a remote Turso database.
 *
 * Prisma Migrate cannot reach a remote libSQL database, so migrations are
 * applied directly over the HTTP driver instead of via the Turso CLI. Applied
 * migrations are recorded in _migrations so re-running is safe.
 *
 * Usage: TURSO_DATABASE_URL=... TURSO_AUTH_TOKEN=... npm run db:deploy
 */

const MIGRATIONS_DIR = path.join(process.cwd(), "prisma", "migrations");

function loadEnv() {
  for (const file of [".env.turso", ".env"]) {
    try {
      process.loadEnvFile(file);
    } catch {
      // absent is fine; ambient environment is used instead
    }
  }
}

const RETRY = {
  attempts: 6,
  onRetry: (error: unknown, attempt: number, delayMs: number) =>
    console.warn(`  transient failure (attempt ${attempt}), retrying in ${delayMs}ms: ${(error as Error).message}`),
};

function listMigrations(): { name: string; file: string }[] {
  return fs
    .readdirSync(MIGRATIONS_DIR, { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .map((d) => ({ name: d.name, file: path.join(MIGRATIONS_DIR, d.name, "migration.sql") }))
    .filter((m) => fs.existsSync(m.file))
    .sort((a, b) => a.name.localeCompare(b.name));
}

async function ensureTrackingTable(client: Client) {
  await withRetry(() => client.execute(
    `CREATE TABLE IF NOT EXISTS "_migrations" (
       "name" TEXT NOT NULL PRIMARY KEY,
       "appliedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
     )`,
  ), RETRY);
}

async function appliedNames(client: Client): Promise<Set<string>> {
  const r = await withRetry(() => client.execute('SELECT "name" FROM "_migrations"'), RETRY);
  return new Set(r.rows.map((row) => String(row.name)));
}

async function main() {
  loadEnv();

  const url = process.env.TURSO_DATABASE_URL;
  const authToken = process.env.TURSO_AUTH_TOKEN;
  if (!url) throw new Error("TURSO_DATABASE_URL is not set.");
  if (!url.startsWith("libsql://") && !url.startsWith("https://")) {
    throw new Error(`Refusing to run migrations against a non-remote URL: ${url}`);
  }

  const client = createClient({ url, authToken });
  const migrations = listMigrations();
  if (migrations.length === 0) throw new Error(`No migrations found in ${MIGRATIONS_DIR}`);

  await ensureTrackingTable(client);
  const done = await appliedNames(client);

  let applied = 0;
  for (const m of migrations) {
    if (done.has(m.name)) {
      console.log(`skip  ${m.name} (already applied)`);
      continue;
    }
    const sql = fs.readFileSync(m.file, "utf8");
    // Each migration runs in its own transaction so a failure leaves the
    // database on the last fully applied migration rather than half way
    // through. The whole migration is replayed together on a transient
    // failure, so a partial application is never recorded as complete.
    await withRetry(async () => {
      const tx = await client.transaction("write");
      try {
        await tx.executeMultiple(sql);
        await tx.execute({ sql: 'INSERT INTO "_migrations" ("name") VALUES (?)', args: [m.name] });
        await tx.commit();
      } catch (e) {
        await tx.rollback().catch(() => {});
        throw e;
      } finally {
        tx.close();
      }
    }, RETRY);
    {
      console.log(`apply ${m.name}`);
      applied++;
    }
  }

  console.log(applied === 0 ? "Database already up to date." : `Applied ${applied} migration(s).`);
  client.close();
}

main().catch((e) => {
  // "fetch failed" alone hides the cause (DNS, TLS, timeout, auth), so unwrap it.
  const detail = (e as Error).message;
  let cause = (e as { cause?: unknown }).cause;
  const chain: string[] = [];
  while (cause) {
    const c = cause as { message?: string; code?: string };
    chain.push([c.code, c.message].filter(Boolean).join(": ") || String(cause));
    cause = (cause as { cause?: unknown }).cause;
  }
  console.error(`db:deploy failed: ${detail}`);
  if (chain.length) console.error(`caused by: ${chain.join(" <- ")}`);
  process.exit(1);
});
