import Link from "next/link";
import { asc, eq } from "drizzle-orm";
import { Plus } from "lucide-react";
import { db, t } from "@/db/client";
import { ButtonLink } from "@/components/ui/button";
import { StatusSelect } from "@/components/admin/status-controls";
import { AdminSearch } from "@/components/admin/admin-search";
import { DataStatusBadge } from "@/components/catalog/meta";
import { normalise } from "@/lib/activity-filters";
import { requireAdminPage } from "@/lib/auth";

export default async function AdminAttractions({ searchParams }: { searchParams: Promise<{ q?: string; status?: string; destination?: string }> }) {
  await requireAdminPage(undefined, "/admin/attractions");
  const sp = await searchParams;
  const dests = await db.select({ id: t.destinations.id, name: t.destinations.name }).from(t.destinations).orderBy(asc(t.destinations.name)).all();
  const rows = (await db.select({ a: t.attractions, d: t.destinations.name }).from(t.attractions).innerJoin(t.destinations, eq(t.destinations.id, t.attractions.destinationId)).orderBy(asc(t.destinations.name), asc(t.attractions.name)).all())
    .filter(({ a, d }) => (!sp.status || a.status === sp.status) && (!sp.destination || a.destinationId === sp.destination) && (!sp.q || normalise(`${a.name} ${d}`).includes(normalise(sp.q))));
  return (
    <div>
      <div className="flex items-center justify-between"><h1 className="text-3xl">Attractions <span className="text-lg text-muted">({rows.length})</span></h1><ButtonLink href="/admin/attractions/new"><Plus className="size-4" />New attraction</ButtonLink></div>
      <AdminSearch destinations={dests} />
      <div className="mt-4 relative overflow-x-auto rounded-md border border-line">
        <table className="w-full min-w-[720px] text-sm">
          <thead className="bg-surface-2 text-left text-xs text-muted"><tr><th className="px-3 py-2">Name</th><th className="px-3 py-2">Destination</th><th className="px-3 py-2">Hours</th><th className="px-3 py-2">Fee</th><th className="px-3 py-2">Status</th></tr></thead>
          <tbody className="divide-y divide-line bg-surface">
            {rows.map(({ a, d }) => (
              <tr key={a.id}>
                <td className="px-3 py-2"><Link href={`/admin/attractions/${a.id}`} className="font-medium hover:text-accent">{a.name}</Link></td>
                <td className="px-3 py-2 text-muted">{d}</td>
                <td className="px-3 py-2"><DataStatusBadge status={a.openingHoursStatus} /></td>
                <td className="px-3 py-2"><DataStatusBadge status={a.feeStatus} /></td>
                <td className="px-3 py-2"><StatusSelect entityType="attraction" id={a.id} status={a.status} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
