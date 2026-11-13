import "server-only";
import { and, asc, eq } from "drizzle-orm";
import { db, t } from "@/db/client";
import { sourcesFor } from "./catalog";

export async function guideSections() {
  const secs = await db.select().from(t.guideSections).orderBy(asc(t.guideSections.sort)).all();
  const counts = await db.select({ sectionId: t.travelGuides.sectionId }).from(t.travelGuides).where(eq(t.travelGuides.status, "published")).all();
  return secs.map((s) => ({ ...s, articleCount: counts.filter((c) => c.sectionId === s.id).length }));
}

export async function guideSection(slug: string) {
  const s = await db.select().from(t.guideSections).where(eq(t.guideSections.slug, slug)).get();
  if (!s) return null;
  const articles = await db.select().from(t.travelGuides).where(and(eq(t.travelGuides.sectionId, s.id), eq(t.travelGuides.status, "published"))).orderBy(asc(t.travelGuides.sort)).all();
  const sources = await sourcesFor("guide", articles.map((a) => a.id));
  return { section: s, articles: articles.map((a) => ({ ...a, sources: sources.filter((x: (typeof sources)[number]) => x.entityId === a.id) })) };
}

export async function checklistItems(list: "preparation" | "packing") {
  return await db.select().from(t.preparationChecklists).where(eq(t.preparationChecklists.list, list)).orderBy(asc(t.preparationChecklists.sort)).all();
}

export async function checklistDone(userId: string | null | undefined) {
  if (!userId) return [];
  return (await db.select({ id: t.checklistProgress.itemId }).from(t.checklistProgress).where(eq(t.checklistProgress.userId, userId)).all()).map((r) => r.id);
}
