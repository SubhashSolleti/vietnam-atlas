import Link from "next/link";
import { asc, eq } from "drizzle-orm";
import { Plus } from "lucide-react";
import { db, t } from "@/db/client";
import { ButtonLink } from "@/components/ui/button";
import { FeaturedToggle, StatusSelect } from "@/components/admin/status-controls";
import { AdminSearch } from "@/components/admin/admin-search";
import { normalise } from "@/lib/activity-filters";
import { requireAdminPage } from "@/lib/auth";

export default async function AdminDestinations({ searchParams }: { searchParams: Promise<{ q?: string; status?: string }> }) {
  await requireAdminPage(undefined, "/admin/destinations");
  const sp = await searchParams;
  const rows = db.select({ d: t.destinations, r: t.regions.name }).from(t.destinations).innerJoin(t.regions, eq(t.regions.id, t.destinations.regionId)).orderBy(asc(t.destinations.name)).all()
    .filter(({ d }) => (!sp.status || d.status === sp.status) && (!sp.q || normalise(`${d.name} ${d.province}`).includes(normalise(sp.q))));
  return (
    <div>
      <div className="flex items-center justify-between"><h1 className="text-3xl">Destinations <span className="text-lg text-muted">({rows.length})</span></h1><ButtonLink href="/admin/destinations/new"><Plus className="size-4" />New destination</ButtonLink></div>
      <AdminSearch />
      <div className="mt-4 relative overflow-x-auto rounded-md border border-line">
        <table className="w-full min-w-[640px] text-sm">
          <thead className="bg-surface-2 text-left text-xs text-muted"><tr><th className="px-3 py-2">Name</th><th className="px-3 py-2">Region</th><th className="px-3 py-2">Kind</th><th className="px-3 py-2">Province</th><th className="px-3 py-2">Status</th><th className="px-3 py-2"><span className="sr-only">Featured</span></th></tr></thead>
          <tbody className="divide-y divide-line bg-surface">
            {rows.map(({ d, r }) => (
              <tr key={d.id}>
                <td className="px-3 py-2"><Link href={`/admin/destinations/${d.id}`} className="font-medium hover:text-accent">{d.name}</Link></td>
                <td className="px-3 py-2 text-muted">{r}</td><td className="px-3 py-2 capitalize">{d.kind.replace("_", " ")}</td><td className="px-3 py-2 text-muted">{d.province}</td>
                <td className="px-3 py-2"><StatusSelect entityType="destination" id={d.id} status={d.status} /></td>
                <td className="px-3 py-2"><FeaturedToggle entityType="destination" id={d.id} featured={d.featured} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
