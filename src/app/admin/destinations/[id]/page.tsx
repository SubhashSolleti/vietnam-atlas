import Link from "next/link";
import { notFound } from "next/navigation";
import { and, asc, eq } from "drizzle-orm";
import { db, t } from "@/db/client";
import { sourcesFor } from "@/services/catalog";
import { DestinationEditor } from "@/components/admin/destination-editor";
import { SourcesEditor } from "@/components/admin/sources-editor";
import { MediaEditor } from "@/components/admin/media-editor";
import { requireAdminPage } from "@/lib/auth";

export default async function EditDestination({ params }: { params: Promise<{ id: string }> }) {
  await requireAdminPage(undefined, "/admin/destinations");
  const { id } = await params;
  const d = id === "new" ? null : await db.select().from(t.destinations).where(eq(t.destinations.id, id)).get();
  if (id !== "new" && !d) notFound();
  const regions = await db.select({ id: t.regions.id, name: t.regions.name }).from(t.regions).orderBy(asc(t.regions.sort)).all();
  const parents = (await db.select({ id: t.destinations.id, name: t.destinations.name }).from(t.destinations).orderBy(asc(t.destinations.name)).all()).filter((x) => x.id !== d?.id);
  const images = d ? await db.select({ link: t.entityMedia, m: t.media }).from(t.entityMedia).innerJoin(t.media, eq(t.media.id, t.entityMedia.mediaId)).where(and(eq(t.entityMedia.entityType, "destination"), eq(t.entityMedia.entityId, d.id))).orderBy(asc(t.entityMedia.sort)).all() : [];
  return (
    <div>
      <Link href="/admin/destinations" className="text-xs text-muted hover:text-ink">← Destinations</Link>
      <h1 className="mt-2 text-3xl">{d ? d.name : "New destination"}</h1>
      {d && <p className="mt-1 text-xs text-muted">Last updated {d.updatedAt.slice(0, 16).replace("T", " ")} by {d.updatedBy ?? "-"} · <Link href={`/destinations/${d.slug}`} className="text-accent underline" target="_blank">View public page</Link></p>}
      <DestinationEditor id={d?.id ?? null} initial={d ?? null} regions={regions} parents={parents} />
      {d && (
        <div className="mt-12 grid gap-10">
          <SourcesEditor entityType="destination" entityId={d.id} sources={await sourcesFor("destination", [d.id])} />
          <MediaEditor entityType="destination" entityId={d.id} images={images.map(({ link, m }) => ({ linkId: link.id, src: m.src, alt: m.alt, role: link.role, author: m.author, license: m.license }))} />
        </div>
      )}
    </div>
  );
}
