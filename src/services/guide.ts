import "server-only";
import { and, asc, eq } from "drizzle-orm";
import { db, t } from "@/db/client";
import { sourcesFor } from "./catalog";

export function guideSections() {
  const secs = db.select().from(t.guideSections).orderBy(asc(t.guideSections.sort)).all();
  const counts = db.select({ sectionId: t.travelGuides.sectionId }).from(t.travelGuides).where(eq(t.travelGuides.status, "published")).all();
  return secs.map((s) => ({ ...s, articleCount: counts.filter((c) => c.sectionId === s.id).length }));
}

export function guideSection(slug: string) {
  const s = db.select().from(t.guideSections).where(eq(t.guideSections.slug, slug)).get();
  if (!s) return null;
  const articles = db.select().from(t.travelGuides).where(and(eq(t.travelGuides.sectionId, s.id), eq(t.travelGuides.status, "published"))).orderBy(asc(t.travelGuides.sort)).all();
  const sources = sourcesFor("guide", articles.map((a) => a.id));
  return { section: s, articles: articles.map((a) => ({ ...a, sources: sources.filter((x) => x.entityId === a.id) })) };
}

export function checklistItems(list: "preparation" | "packing") {
  return db.select().from(t.preparationChecklists).where(eq(t.preparationChecklists.list, list)).orderBy(asc(t.preparationChecklists.sort)).all();
}

export function checklistDone(userId: string | null | undefined) {
  if (!userId) return [];
  return db.select({ id: t.checklistProgress.itemId }).from(t.checklistProgress).where(eq(t.checklistProgress.userId, userId)).all().map((r) => r.id);
}
