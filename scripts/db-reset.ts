/**
 * Empties the database, re-applies migrations and seeds it.
 *   npm run db:reset                         # local databases only
 *   npm run db:reset -- --yes-really-reset   # any database (e.g. a fresh Supabase project). Deletes all app data.
 */
import { execSync } from "node:child_process";
import postgres from "postgres";
import { databaseUrl, describeDatabase } from "../src/db/open";

const url = databaseUrl("migrations");
const local = /@(localhost|127\.0\.0\.1)[:/]/.test(url);
if (!local && !process.argv.includes("--yes-really-reset")) {
  console.error(`Refusing to reset ${describeDatabase(url)}: it isn't a local database.\nRe-run with --yes-really-reset if you really want to delete all its data.`);
  process.exit(1);
}

const sql = postgres(url, { prepare: false, max: 1, ssl: local ? false : "require", onnotice: () => {} });
// Drop only this app's tables (never the schema itself: Supabase attaches grants and extensions to it).
const tables = await sql<{ tablename: string }[]>`select tablename from pg_tables where schemaname = 'public'`;
for (const { tablename } of tables) await sql.unsafe(`drop table if exists public."${tablename}" cascade`);
await sql`drop schema if exists drizzle cascade`;
await sql.end();
console.log(`Emptied ${describeDatabase(url)} (${tables.length} tables).`);

execSync("npx tsx src/db/migrate.ts", { stdio: "inherit", env: process.env });
execSync("npx tsx src/db/seed/index.ts", { stdio: "inherit", env: process.env });
