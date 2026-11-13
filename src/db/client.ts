import "server-only";
import { openDatabase, type Database } from "./open";

declare global {
  // eslint-disable-next-line no-var
  var __atlasDb: Database | undefined;
}

/** One pooled client per server process (survives dev hot reloads). The pool connects lazily on first query. */
export const db: Database = globalThis.__atlasDb ?? (globalThis.__atlasDb = openDatabase().db);
export * as t from "./schema";
