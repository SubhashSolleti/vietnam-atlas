/**
 * `.get()`, `.all()` and `.run()` on Drizzle's Postgres query builders.
 *
 * The app was written against Drizzle's SQLite driver, whose builders end in these three calls. On Postgres
 * every query is asynchronous, so here they return promises with the same meaning:
 *   await db.select()…get()   → the first row, or undefined
 *   await db.select()…all()   → all rows
 *   await db.insert()…run()   → executes the statement
 * Keep queries that use `.get()` narrow (by id or a unique key): it reads the matching rows and returns the first.
 */
import { QueryPromise } from "drizzle-orm/query-promise";

type First<T> = T extends readonly (infer R)[] ? R | undefined : T;

declare module "drizzle-orm/query-promise" {
  interface QueryPromise<T> {
    get(): Promise<First<T>>;
    all(): Promise<T>;
    run(): Promise<T>;
  }
}

const proto = QueryPromise.prototype as unknown as Record<string, unknown>;
if (!proto.get) {
  Object.defineProperties(proto, {
    get: {
      value(this: QueryPromise<unknown>) {
        return this.then((rows) => (Array.isArray(rows) ? rows[0] : rows));
      },
    },
    all: {
      value(this: QueryPromise<unknown>) {
        return this.then((rows) => rows);
      },
    },
    run: {
      value(this: QueryPromise<unknown>) {
        return this.then((result) => result);
      },
    },
  });
}

export {};
