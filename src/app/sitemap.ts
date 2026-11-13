import type { MetadataRoute } from "next";
import { db, t } from "@/db/client";
import { getCatalog } from "@/services/catalog";
import { absoluteUrl } from "@/lib/utils";
import { eq } from "drizzle-orm";

// Built from the database on request, so a production build never depends on database state.
export const dynamic = "force-dynamic";

export default function sitemap(): MetadataRoute.Sitemap {
  const { destinations, activities, regions } = getCatalog();
  const attractions = db.select({ slug: t.attractions.slug, updatedAt: t.attractions.updatedAt }).from(t.attractions).where(eq(t.attractions.status, "published")).all();
  const guide = db.select({ slug: t.guideSections.slug }).from(t.guideSections).all();
  const staticPaths = ["/", "/explore", "/destinations", "/experiences", "/guide", "/map", "/connect", "/about", "/sources", "/privacy", "/terms", "/legal", "/contact"];
  return [
    ...staticPaths.map((p) => ({ url: absoluteUrl(p), changeFrequency: "weekly" as const, priority: p === "/" ? 1 : 0.7 })),
    ...regions.map((r) => ({ url: absoluteUrl(`/explore/${r.slug}`), priority: 0.7 })),
    ...destinations.map((d) => ({ url: absoluteUrl(`/destinations/${d.slug}`), priority: 0.8 })),
    ...attractions.map((a) => ({ url: absoluteUrl(`/attractions/${a.slug}`), lastModified: a.updatedAt, priority: 0.5 })),
    ...activities.map((a) => ({ url: absoluteUrl(`/experiences/${a.slug}`), priority: 0.6 })),
    ...guide.map((g) => ({ url: absoluteUrl(`/guide/${g.slug}`), priority: 0.6 })),
  ];
}
