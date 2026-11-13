import "server-only";
import { openDatabase, type Database } from "./open";

declare global {
  // eslint-disable-next-line no-var
  var __atlasDb: Database | undefined;
}

/**
 * One pooled client per server process (survives dev hot reloads), opened on first use rather than at import.
 * Importing this module never needs DATABASE_URL, so builds without a database (e.g. preview deployments) still work;
 * a missing URL only errors when a query actually runs.
 */
const real = () => (globalThis.__atlasDb ??= openDatabase().db);

export const db = new Proxy({} as Database, {
  get(_target, prop) {
    const target = real();
    const value = Reflect.get(target, prop, target);
    return typeof value === "function" ? value.bind(target) : value;
  },
});

export * as t from "./schema";
