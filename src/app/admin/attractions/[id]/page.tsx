import Link from "next/link";
import { notFound } from "next/navigation";
import { and, asc, eq } from "drizzle-orm";
import { db, t } from "@/db/client";
import { sourcesFor } from "@/services/catalog";
import { AttractionEditor } from "@/components/admin/attraction-editor";
import { SourcesEditor } from "@/components/admin/sources-editor";
import { MediaEditor } from "@/components/admin/media-editor";
import { requireAdminPage } from "@/lib/auth";

export default async function EditAttraction({ params }: { params: Promise<{ id: string }> }) {
  await requireAdminPage(undefined, "/admin/attractions");
  const { id } = await params;
  const a = id === "new" ? null : db.select().from(t.attractions).where(eq(t.attractions.id, id)).get();
  if (id !== "new" && !a) notFound();
  const dests = db.select({ id: t.destinations.id, name: t.destinations.name }).from(t.destinations).orderBy(asc(t.destinations.name)).all();
  const images = a ? db.select({ link: t.entityMedia, m: t.media }).from(t.entityMedia).innerJoin(t.media, eq(t.media.id, t.entityMedia.mediaId)).where(and(eq(t.entityMedia.entityType, "attraction"), eq(t.entityMedia.entityId, a.id))).orderBy(asc(t.entityMedia.sort)).all() : [];
  return (
    <div>
      <Link href="/admin/attractions" className="text-xs text-muted hover:text-ink">← Attractions</Link>
      <h1 className="mt-2 text-3xl">{a ? a.name : "New attraction"}</h1>
      <AttractionEditor id={a?.id ?? null} initial={a ?? null} destinations={dests} />
      {a && (
        <div className="mt-12 grid gap-10">
          <SourcesEditor entityType="attraction" entityId={a.id} sources={sourcesFor("attraction", [a.id])} />
          <MediaEditor entityType="attraction" entityId={a.id} images={images.map(({ link, m }) => ({ linkId: link.id, src: m.src, alt: m.alt, role: link.role, author: m.author, license: m.license }))} />
        </div>
      )}
    </div>
  );
}
