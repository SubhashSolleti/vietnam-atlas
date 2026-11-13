import { migrate } from "drizzle-orm/better-sqlite3/migrator";
import { resolve } from "node:path";
import { databasePath, openDatabase } from "./open";

const db = openDatabase();
migrate(db, { migrationsFolder: resolve(import.meta.dirname, "migrations") });
console.log(`Migrations applied to ${databasePath()}`);
