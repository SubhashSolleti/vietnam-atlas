import { migrate } from "drizzle-orm/postgres-js/migrator";
import { resolve } from "node:path";
import { databaseUrl, describeDatabase, openDatabase } from "./open";

const { db, client } = openDatabase("migrations");
await migrate(db, { migrationsFolder: resolve(import.meta.dirname, "migrations") });
console.log(`Migrations applied to ${describeDatabase(databaseUrl("migrations"))}`);
await client.end();
