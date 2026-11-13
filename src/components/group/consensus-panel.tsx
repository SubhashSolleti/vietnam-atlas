"use client";

import { CalendarX2, Heart, Lightbulb, ThumbsDown, User, Users, Wallet } from "lucide-react";
import Link from "next/link";
import { useTransition } from "react";
import { setCandidateStatus } from "@/app/actions/trips";
import { Money } from "@/components/catalog/price";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { useToast } from "@/components/ui/toast";
import type { CandidateAnalysis } from "@/lib/consensus";

type Item = { id: string; title: string; slug: string; destination: string; status: string; perPersonVnd: number; analysis: CandidateAnalysis };

export function ConsensusPanel({ items, suggestedIds, canManage, memberCount }: { tripId: string; items: Item[]; suggestedIds: string[]; canManage: boolean; memberCount: number }) {
  const toast = useToast();
  const [pending, start] = useTransition();
  if (!items.length) return <EmptyState as="h2" title="Nothing to decide yet">Add experiences to the shortlist and vote; this page then shows where the group agrees.</EmptyState>;
  const suggested = suggestedIds.map((id) => items.find((i) => i.id === id)!).filter(Boolean);
  const groups: { title: string; icon: typeof Users; desc: string; list: Item[] }[] = [
    { title: "Popular with everyone", icon: Users, desc: "Most of the group voted and nobody objected.", list: items.filter((i) => i.analysis.flags.popularWithEveryone) },
    { title: "Popular with couples", icon: Heart, desc: "Average couple vote of Interested or better.", list: items.filter((i) => i.analysis.flags.popularWithCouples) },
    { title: "Popular with solo travellers", icon: User, desc: "Average solo vote of Interested or better.", list: items.filter((i) => i.analysis.flags.popularWithSolo) },
    { title: "Low interest", icon: ThumbsDown, desc: "Few positive votes or a negative average.", list: items.filter((i) => i.analysis.flags.lowInterest) },
    { title: "Exceeds remaining budget", icon: Wallet, desc: "Per-person cost is more than the tightest traveller's remaining budget.", list: items.filter((i) => i.analysis.flags.exceedsBudget) },
    { title: "Unsuitable for the season", icon: CalendarX2, desc: "Poor or closed during the trip dates.", list: items.filter((i) => i.analysis.flags.seasonUnsuitable) },
  ];
  const approveAll = () =>
    start(async () => {
      for (const s of suggested) if (s.status === "discussion") await setCandidateStatus(s.id, "approved");
      toast({ tone: "success", title: "Suggested shortlist approved" });
    });
  return (
    <div className="space-y-8">
      <section className="rounded-md border border-brand/25 bg-good-soft/50 p-5 md:p-6" aria-labelledby="sugg">
        <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
          <div>
            <h2 id="sugg" className="flex items-center gap-2 text-2xl"><Lightbulb className="size-5 text-brand-2" /> Suggested group shortlist</h2>
            <p className="mt-1 max-w-2xl text-sm text-muted">Positively voted, in season and not low-interest, ranked by score. This is a suggestion only: nothing changes until the owner or an editor approves it.</p>
          </div>
          {canManage && suggested.some((s) => s.status === "discussion") && (
            <Button onClick={approveAll} disabled={pending}>Approve suggested items</Button>
          )}
        </div>
        {suggested.length ? (
          <ol className="mt-4 divide-y divide-line rounded-md border border-line bg-surface">
            {suggested.map((s, i) => (
              <li key={s.id} className="flex flex-wrap items-center gap-3 px-4 py-3 text-sm">
                <span className="grid size-7 place-items-center rounded-full bg-brand text-xs font-semibold text-brand-ink tabular-nums">{i + 1}</span>
                <Link href={`/experiences/${s.slug}`} className="min-w-0 flex-1 font-medium hover:text-accent">{s.title} <span className="font-normal text-muted">· {s.destination}</span></Link>
                <span className="text-muted tabular-nums">{s.analysis.counts.must_do} must · {s.analysis.counts.interested} interested</span>
                <span className="w-28 text-right"><Money vnd={s.perPersonVnd} showVnd={false} /> pp</span>
                <span className="w-24 text-right text-xs text-muted">{s.status === "discussion" ? "Not decided" : s.status}</span>
              </li>
            ))}
          </ol>
        ) : (
          <p className="mt-4 text-sm text-muted">Not enough votes yet. At least some of the {memberCount} travellers need to vote “Interested” or “Must do”.</p>
        )}
      </section>
      <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
        {groups.map((g) => (
          <section key={g.title} className="rounded-md border border-line bg-surface p-5">
            <h3 className="flex items-center gap-2 font-sans text-base font-semibold"><g.icon className="size-4 text-muted" />{g.title} <span className="text-muted tabular-nums">({g.list.length})</span></h3>
            <p className="mt-1 text-xs text-muted">{g.desc}</p>
            {g.list.length ? (
              <ul className="mt-3 space-y-1.5 text-sm">
                {g.list.map((i) => (
                  <li key={i.id}><Link href={`/experiences/${i.slug}`} className="hover:text-accent">{i.title}</Link></li>
                ))}
              </ul>
            ) : (
              <p className="mt-3 text-sm text-muted">None.</p>
            )}
          </section>
        ))}
      </div>
    </div>
  );
}
