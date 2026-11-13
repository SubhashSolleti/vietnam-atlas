import "server-only";
import { and, asc, eq, inArray } from "drizzle-orm";
import { db, t } from "@/db/client";

export interface ImageRef {
  id: string;
  src: string;
  width: number | null;
  height: number | null;
  alt: string;
  author: string | null;
  license: string | null;
  licenseUrl: string | null;
  sourceUrl: string | null;
  representative: boolean;
  role: "hero" | "gallery" | "card";
}

type EntityType = "region" | "destination" | "attraction" | "activity";

export async function imagesFor(entityType: EntityType, ids: string[]) {
  const out = new Map<string, ImageRef[]>();
  if (!ids.length) return out;
  const rows = await db
    .select({ link: t.entityMedia, m: t.media })
    .from(t.entityMedia)
    .innerJoin(t.media, eq(t.media.id, t.entityMedia.mediaId))
    .where(and(eq(t.entityMedia.entityType, entityType), inArray(t.entityMedia.entityId, ids)))
    .orderBy(asc(t.entityMedia.sort))
    .all();
  for (const { link, m } of rows) {
    const list = out.get(link.entityId) ?? [];
    list.push({
      id: m.id,
      src: m.src,
      width: m.width,
      height: m.height,
      alt: m.alt,
      author: m.author,
      license: m.license,
      licenseUrl: m.licenseUrl,
      sourceUrl: m.sourceUrl,
      representative: m.representative,
      role: link.role,
    });
    out.set(link.entityId, list);
  }
  return out;
}

export function heroOf(list: ImageRef[] | undefined) {
  if (!list?.length) return null;
  return list.find((i) => i.role === "hero") ?? list[0]!;
}
