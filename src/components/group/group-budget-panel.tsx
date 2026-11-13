import Link from "next/link";
import { Money } from "@/components/catalog/price";
import { Avatar } from "@/components/ui/avatar";
import type { BudgetResult } from "@/lib/budget-engine";
import { cn } from "@/lib/utils";

/** Group-level money view (spec §10.5): who pays what, based on actual participation. */
export function GroupBudgetPanel({
  members,
  budget,
  candidates,
}: {
  members: { id: string; name: string; color: string }[];
  budget: BudgetResult;
  inrToVnd: number;
  candidates: { id: string; title: string; perPersonVnd: number; participants: string[] | null; isQuote: boolean }[];
}) {
  const activityLines = budget.lines.filter((l) => l.category === "paid_activities" || l.category === "free_activities");
  const activityTotal = activityLines.reduce((s, l) => s + l.groupTotalVnd, 0);
  const perMemberActivities = Object.fromEntries(members.map((m) => [m.id, activityLines.filter((l) => l.participantIds.includes(m.id)).reduce((s, l) => s + l.perParticipantVnd, 0)]));
  const optionalLines = activityLines.filter((l) => l.optional);
  const max = Math.max(1, ...Object.values(budget.perMember));
  return (
    <div className="space-y-8">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Kpi label="Total activity cost (group)" value={<Money vnd={activityTotal} />} />
        <Kpi label="Shared costs (split)" value={<Money vnd={budget.sharedTotalVnd} />} />
        <Kpi label="Optional activities" value={<Money vnd={optionalLines.reduce((s, l) => s + l.groupTotalVnd, 0)} />} sub={`${optionalLines.length} not everyone joins`} />
        <Kpi label="Whole trip, average pp" value={<Money vnd={budget.averagePerPersonVnd} />} sub={budget.targetPerPersonVnd ? <>Target <Money vnd={budget.targetPerPersonVnd} showVnd={false} /></> : undefined} />
      </div>
      <section aria-labelledby="pp">
        <div className="mb-4 flex items-end justify-between">
          <h2 id="pp" className="text-2xl">Per-person totals</h2>
          <Link href="/trip/budget" className="text-sm font-semibold text-accent hover:underline">Open full budget →</Link>
        </div>
        <ul className="divide-y divide-line rounded-md border border-line bg-surface">
          {members.map((m) => {
            const total = budget.perMember[m.id] ?? 0;
            const remaining = budget.remainingPerMember?.[m.id];
            return (
              <li key={m.id} className="grid grid-cols-[auto_1fr] items-center gap-x-3 gap-y-1 px-4 py-3 md:grid-cols-[auto_10rem_1fr_9rem_9rem]">
                <Avatar name={m.name} color={m.color} size={30} />
                <span className="font-medium">{m.name}</span>
                <div className="col-span-2 h-2 rounded-full bg-surface-2 md:col-span-1">
                  <div className={cn("h-full rounded-full", remaining != null && remaining < 0 ? "bg-bad" : "bg-brand-2")} style={{ width: `${(total / max) * 100}%` }} />
                </div>
                <span className="text-sm tabular-nums"><Money vnd={total} showVnd={false} /> <span className="text-xs text-muted">total</span></span>
                <span className="text-sm tabular-nums">
                  <Money vnd={perMemberActivities[m.id] ?? 0} showVnd={false} /> <span className="text-xs text-muted">activities</span>
                  {remaining != null && <span className={cn("block text-xs", remaining < 0 ? "text-bad" : "text-good")}>{remaining < 0 ? "Over by " : "Left "}<Money vnd={Math.abs(remaining)} showVnd={false} /></span>}
                </span>
              </li>
            );
          })}
        </ul>
        <p className="mt-2 text-xs text-muted">Totals include planned activities, transport, stays, expenses and illustrative daily estimates (food, local transport, accommodation for unplanned nights). Differences between travellers come from optional activities.</p>
      </section>
      <section aria-labelledby="appr">
        <h2 id="appr" className="mb-4 text-2xl">Approved activities</h2>
        {candidates.length ? (
          <ul className="divide-y divide-line rounded-md border border-line bg-surface text-sm">
            {candidates.map((c) => {
              const n = c.participants?.length ?? members.length;
              return (
                <li key={c.id} className="flex flex-wrap items-center gap-3 px-4 py-3">
                  <span className="min-w-0 flex-1 font-medium">{c.title}</span>
                  <span className="text-muted">{n === members.length ? "Everyone" : `${n} of ${members.length}`}</span>
                  <span className="w-32 text-right"><Money vnd={c.perPersonVnd} showVnd={false} /> pp</span>
                  <span className="w-36 text-right font-semibold"><Money vnd={c.perPersonVnd * n} showVnd={false} /> group</span>
                  <span className="w-20 text-right text-xs text-muted">{c.isQuote ? "Quote" : "Estimate"}</span>
                </li>
              );
            })}
          </ul>
        ) : (
          <p className="text-sm text-muted">No approved activities yet.</p>
        )}
      </section>
    </div>
  );
}

function Kpi({ label, value, sub }: { label: string; value: React.ReactNode; sub?: React.ReactNode }) {
  return (
    <div className="rounded-md border border-line bg-surface p-5">
      <p className="text-sm text-muted">{label}</p>
      <p className="mt-1 text-2xl font-semibold">{value}</p>
      {sub && <p className="mt-1 text-xs text-muted">{sub}</p>}
    </div>
  );
}
