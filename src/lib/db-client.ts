import path from "node:path";
import { PrismaLibSQL } from "@prisma/adapter-libsql";
import { PrismaClient } from "@prisma/client";

/**
 * The libSQL driver resolves `file:` URLs relative to the process working
 * directory, while the Prisma CLI resolves them relative to the prisma/
 * directory. Left alone, the app would silently open (and create) a different,
 * empty database than the one `prisma db push` and `prisma db seed` populate.
 * Normalising here keeps the CLI and the runtime pointed at the same file.
 */
function normalizeLocalUrl(url: string): string {
  if (!url.startsWith("file:")) return url;
  const raw = url.slice("file:".length);
  return `file:${path.resolve(process.cwd(), "prisma", raw)}`;
}

/**
 * Turso (libSQL) connection resolution.
 *
 * Production points at a remote Turso database over HTTP. Local development can
 * point at a local SQLite file instead, which the same libSQL driver supports,
 * so `npm run dev` needs no remote database.
 *
 * TURSO_DATABASE_URL wins when present; otherwise DATABASE_URL is used, which
 * keeps a plain `file:./dev.db` working for local development.
 */
function resolveConfig(): { url: string; authToken?: string } {
  const tursoUrl = process.env.TURSO_DATABASE_URL?.trim();
  if (tursoUrl) {
    const token = process.env.TURSO_AUTH_TOKEN?.trim();
    if (process.env.NODE_ENV === "production" && !token) {
      throw new Error("TURSO_AUTH_TOKEN must be set when TURSO_DATABASE_URL is a remote database.");
    }
    return { url: tursoUrl, authToken: token };
  }

  const localUrl = process.env.DATABASE_URL?.trim();
  if (!localUrl) {
    throw new Error(
      "No database configured. Set TURSO_DATABASE_URL (and TURSO_AUTH_TOKEN) for a remote Turso database, or DATABASE_URL for a local file.",
    );
  }
  return { url: normalizeLocalUrl(localUrl) };
}

export function createPrismaClient(): PrismaClient {
  const { url, authToken } = resolveConfig();
  const adapter = new PrismaLibSQL(authToken ? { url, authToken } : { url });
  return new PrismaClient({
    adapter,
    log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
  });
}
