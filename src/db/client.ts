import "server-only";
import { openDatabase } from "./open";

declare global {
  // eslint-disable-next-line no-var
  var __atlasDb: ReturnType<typeof openDatabase> | undefined;
}

/** Single shared connection per server process (survives dev hot reloads). */
export const db = globalThis.__atlasDb ?? (globalThis.__atlasDb = openDatabase());
export * as t from "./schema";
