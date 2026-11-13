import Link from "next/link";
import { notFound } from "next/navigation";
import { and, asc, eq } from "drizzle-orm";
import { db, t } from "@/db/client";
import { sourcesFor } from "@/services/catalog";
import { ActivityEditor } from "@/components/admin/activity-editor";
import { SourcesEditor } from "@/components/admin/sources-editor";
import { MediaEditor } from "@/components/admin/media-editor";
import { StatusBadge } from "@/components/admin/status-controls";
import { requireAdminPage } from "@/lib/auth";

export default async function EditActivity({ params }: { params: Promise<{ id: string }> }) {
  await requireAdminPage(undefined, "/admin/activities");
  const { id } = await params;
  const isNew = id === "new";
  const a = isNew ? null : await db.select().from(t.activities).where(eq(t.activities.id, id)).get();
  if (!isNew && !a) notFound();
  const price = a ? await db.select().from(t.activityPrices).where(and(eq(t.activityPrices.activityId, a.id), eq(t.activityPrices.isCurrent, true))).get() : null;
  const history = a ? await db.select().from(t.activityPrices).where(eq(t.activityPrices.activityId, a.id)).orderBy(asc(t.activityPrices.createdAt)).all() : [];
  const cats = await db.select().from(t.activityCategories).orderBy(asc(t.activityCategories.sort)).all();
  const linked = a ? (await db.select({ id: t.activityCategoryLinks.categoryId }).from(t.activityCategoryLinks).where(eq(t.activityCategoryLinks.activityId, a.id)).all()).map((x) => cats.find((c) => c.id === x.id)?.slug).filter(Boolean) as string[] : [];
  const dests = await db.select({ id: t.destinations.id, name: t.destinations.name }).from(t.destinations).orderBy(asc(t.destinations.name)).all();
  const attrs = await db.select({ id: t.attractions.id, name: t.attractions.name, destinationId: t.attractions.destinationId }).from(t.attractions).orderBy(asc(t.attractions.name)).all();
  const images = a
    ? await db.select({ link: t.entityMedia, m: t.media }).from(t.entityMedia).innerJoin(t.media, eq(t.media.id, t.entityMedia.mediaId)).where(and(eq(t.entityMedia.entityType, "activity"), eq(t.entityMedia.entityId, a.id))).orderBy(asc(t.entityMedia.sort)).all()
    : [];
  return (
    <div>
      <Link href="/admin/activities" className="text-xs text-muted hover:text-ink">← Activities</Link>
      <div className="mt-2 flex flex-wrap items-center gap-3">
        <h1 className="text-3xl">{a ? a.title : "New activity"}</h1>
        {a && <StatusBadge status={a.status} />}
        {a?.status === "published" && <Link href={`/experiences/${a.slug}`} className="text-sm text-accent underline" target="_blank">View public page</Link>}
      </div>
      {a && <p className="mt-1 text-xs text-muted">Created {a.createdAt.slice(0, 10)} · last updated {a.updatedAt.slice(0, 16).replace("T", " ")} by {a.updatedBy ?? "-"}</p>}
      <ActivityEditor
        id={a?.id ?? null}
        initial={a ? { ...a, categories: linked, price: price ?? null } : null}
        categories={cats.map((c) => ({ slug: c.slug, name: c.name, kind: c.kind }))}
        destinations={dests}
        attractions={attrs}
      />
      {a ? (
        <div className="mt-12 grid gap-10">
          <SourcesEditor entityType="activity" entityId={a.id} sources={await sourcesFor("activity", [a.id])} />
          <MediaEditor entityType="activity" entityId={a.id} images={images.map(({ link, m }) => ({ linkId: link.id, src: m.src, alt: m.alt, role: link.role, author: m.author, license: m.license }))} />
          {history.length > 1 && (
            <section>
              <h2 className="mb-3 text-2xl">Price history</h2>
              <ul className="divide-y divide-line rounded-md border border-line bg-surface text-sm">
                {history.map((h) => <li key={h.id} className="flex justify-between px-4 py-2"><span>{h.minVnd.toLocaleString()}–{h.maxVnd.toLocaleString()} ₫ {h.unit} · {h.status}</span><span className="text-xs text-muted">{h.createdAt.slice(0, 10)}{h.isCurrent ? " · current" : ""}</span></li>)}
              </ul>
            </section>
          )}
        </div>
      ) : (
        <p className="mt-8 rounded-md bg-surface-2 p-4 text-sm text-muted">Save the activity as a draft first, then you can add sources and images, and publish it.</p>
      )}
    </div>
  );
}
