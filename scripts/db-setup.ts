/**
 * Release step (runs before `next build` on Vercel): apply migrations, then seed the content if — and only if — the
 * database is empty. Safe to run on every deploy. Skips cleanly when no database is configured (e.g. previews).
 */
import { migrate } from "drizzle-orm/postgres-js/migrator";
import { resolve } from "node:path";
import { sql } from "drizzle-orm";
import { describeDatabase, databaseUrl, openDatabase } from "../src/db/open";

const env = process.env;
if (!env.DATABASE_URL && !env.POSTGRES_URL) {
  console.warn("db:setup: no DATABASE_URL / POSTGRES_URL configured, skipping database setup.");
  process.exit(0);
}

const { db, client } = openDatabase("migrations");
await migrate(db, { migrationsFolder: resolve(import.meta.dirname, "../src/db/migrations") });
console.log(`db:setup: migrations applied to ${describeDatabase(databaseUrl("migrations"))}`);
const rows = await db.execute<{ n: number }>(sql`select count(*)::int as n from users`);
await client.end();

if ((rows[0]?.n ?? 0) > 0) {
  console.log("db:setup: database already has content, not seeding.");
} else {
  // Never let a hosted build generate passwords: they'd only exist in the build log.
  if (env.VERCEL && (!env.SEED_ADMIN_PASSWORD || !env.SEED_EDITOR_PASSWORD))
    throw new Error("db:setup: the database is empty. Set SEED_ADMIN_PASSWORD and SEED_EDITOR_PASSWORD (12+ characters) to seed it.");
  console.log("db:setup: empty database, seeding content…");
  await import("../src/db/seed/index");
}
