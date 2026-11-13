import "server-only";
import { eq } from "drizzle-orm";
import { db, t } from "@/db/client";
import { DEFAULT_FX, type FxRates } from "@/lib/money";

export function getSetting<T>(key: string, fallback: T): T {
  const row = db.select().from(t.settings).where(eq(t.settings.key, key)).get();
  return (row?.value as T) ?? fallback;
}

export function setSetting(key: string, value: unknown, userId?: string) {
  db.insert(t.settings)
    .values({ key, value, updatedBy: userId ?? null })
    .onConflictDoUpdate({ target: t.settings.key, set: { value, updatedBy: userId ?? null, updatedAt: new Date().toISOString() } })
    .run();
}

export function getFx(): FxRates {
  return { ...DEFAULT_FX, ...getSetting<Partial<FxRates>>("fx", {}) };
}
