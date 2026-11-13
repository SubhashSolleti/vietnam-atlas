import Link from "next/link";
import { asc, eq } from "drizzle-orm";
import { Plus } from "lucide-react";
import { db, t } from "@/db/client";
import { ButtonLink } from "@/components/ui/button";
import { FeaturedToggle, StatusSelect } from "@/components/admin/status-controls";
import { AdminSearch } from "@/components/admin/admin-search";
import { normalise } from "@/lib/activity-filters";
import { requireAdminPage } from "@/lib/auth";

const PAGE = 50;

export default async function AdminActivities({ searchParams }: { searchParams: Promise<{ q?: string; status?: string; destination?: string; page?: string }> }) {
  await requireAdminPage(undefined, "/admin/activities");
  const sp = await searchParams;
  const dests = db.select({ id: t.destinations.id, name: t.destinations.name }).from(t.destinations).orderBy(asc(t.destinations.name)).all();
  const rows = db
    .select({ a: t.activities, d: t.destinations.name, price: t.activityPrices.status })
    .from(t.activities)
    .innerJoin(t.destinations, eq(t.destinations.id, t.activities.destinationId))
    .leftJoin(t.activityPrices, eq(t.activityPrices.activityId, t.activities.id))
    .orderBy(asc(t.destinations.name), asc(t.activities.title))
    .all()
    .filter((r) => (!sp.status || r.a.status === sp.status) && (!sp.destination || r.a.destinationId === sp.destination) && (!sp.q || normalise(`${r.a.title} ${r.d}`).includes(normalise(sp.q))));
  const uniq = [...new Map(rows.map((r) => [r.a.id, r])).values()];
  const page = Math.max(1, Number(sp.page) || 1);
  const shown = uniq.slice((page - 1) * PAGE, page * PAGE);
  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-3xl">Activities <span className="text-lg text-muted">({uniq.length})</span></h1>
        <ButtonLink href="/admin/activities/new"><Plus className="size-4" />New activity</ButtonLink>
      </div>
      <AdminSearch destinations={dests} />
      <div className="mt-4 relative overflow-x-auto rounded-md border border-line">
        <table className="w-full min-w-[720px] text-sm">
          <thead className="bg-surface-2 text-left text-xs text-muted"><tr><th className="px-3 py-2">Title</th><th className="px-3 py-2">Destination</th><th className="px-3 py-2">Tier</th><th className="px-3 py-2">Price data</th><th className="px-3 py-2">Updated</th><th className="px-3 py-2">Status</th><th className="px-3 py-2"><span className="sr-only">Featured</span></th></tr></thead>
          <tbody className="divide-y divide-line bg-surface">
            {shown.map(({ a, d, price }) => (
              <tr key={a.id}>
                <td className="px-3 py-2"><Link href={`/admin/activities/${a.id}`} className="font-medium hover:text-accent">{a.title}</Link></td>
                <td className="px-3 py-2 text-muted">{d}</td>
                <td className="px-3 py-2 capitalize">{a.priceTier}</td>
                <td className="px-3 py-2 text-xs">{price?.replace("_", " ")}</td>
                <td className="px-3 py-2 text-xs text-muted">{a.updatedAt.slice(0, 10)} · {a.updatedBy}</td>
                <td className="px-3 py-2"><StatusSelect entityType="activity" id={a.id} status={a.status} /></td>
                <td className="px-3 py-2"><FeaturedToggle entityType="activity" id={a.id} featured={a.featured} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {uniq.length > PAGE && (
        <nav className="mt-4 flex gap-1" aria-label="Pages">
          {Array.from({ length: Math.ceil(uniq.length / PAGE) }, (_, i) => i + 1).map((p) => (
            <Link key={p} href={{ query: { ...sp, page: p } }} aria-current={p === page ? "page" : undefined} className={`grid h-8 min-w-8 place-items-center rounded-sm border px-2 text-sm ${p === page ? "border-brand bg-brand text-brand-ink" : "border-line"}`}>{p}</Link>
          ))}
        </nav>
      )}
    </div>
  );
}
