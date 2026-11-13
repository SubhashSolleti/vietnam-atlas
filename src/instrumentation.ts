/**
 * Runs once when a Next.js server starts, before it handles requests: brings the SQLite schema up to date,
 * so deploying new code can never leave the app reading columns that don't exist yet.
 */
export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  const { migrate } = await import("drizzle-orm/better-sqlite3/migrator");
  const { resolve } = await import("node:path");
  const { openDatabase, databasePath } = await import("./db/open");
  migrate(openDatabase(), { migrationsFolder: resolve(/*turbopackIgnore: true*/ process.cwd(), "src/db/migrations") });
  console.log(`Database schema up to date (${databasePath()})`);
}
