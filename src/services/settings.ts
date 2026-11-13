import "server-only";
import { eq } from "drizzle-orm";
import { db, t } from "@/db/client";
import { DEFAULT_FX, type FxRates } from "@/lib/money";

export async function getSetting<T>(key: string, fallback: T): Promise<T> {
  const row = await db.select().from(t.settings).where(eq(t.settings.key, key)).get();
  return (row?.value as T) ?? fallback;
}

export async function setSetting(key: string, value: unknown, userId?: string) {
  await db.insert(t.settings)
    .values({ key, value, updatedBy: userId ?? null })
    .onConflictDoUpdate({ target: t.settings.key, set: { value, updatedBy: userId ?? null, updatedAt: new Date().toISOString() } })
    .run();
}

export async function getFx(): Promise<FxRates> {
  return { ...DEFAULT_FX, ...(await getSetting<Partial<FxRates>>("fx", {})) };
}
