"use client";

import { Check, ChevronDown, History, Plus, Printer, Sparkles, Star, X } from "lucide-react";
import Link from "next/link";
import { Fragment, useMemo, useState, useTransition } from "react";
import { generatePersonalPlans, type PlanSummary } from "@/app/actions/plans";
import { addCandidate, castVote } from "@/app/actions/trips";
import { Money } from "@/components/catalog/price";
import { Avatar } from "@/components/ui/avatar";
import { Button, ButtonLink } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { useToast } from "@/components/ui/toast";
import { VOTE_LABELS } from "@/content/taxonomy";
import { cn, formatDay, formatDuration } from "@/lib/utils";

type Vote = keyof typeof VOTE_LABELS;
type Member = { id: string; name: string; color: string; joined: boolean };
type PriceInfo = { minVnd: number; maxVnd: number; unit: string; status: string } | null;
export type PickItem = {
  id: string;
  type: string;
  title: string;
  time: string | null;
  durationMin: number | null;
  notes: string | null;
  activityId: string | null;
  slug: string | null;
  candidateId: string | null;
  participants: string[] | null;
};
export type PickDay = { id: string; date: string; title: string | null; notes: string | null; destinationId: string | null; destinationName: string | null; items: PickItem[] };
export type PickExtra = { activityId: string; title: string; slug: string; durationMin: number; tier: "free" | "low" | "paid"; price: PriceInfo; candidateId: string | null; destinationId: string };

const OUT: Vote[] = ["not_interested", "cannot", "done_before"];
const IN: Vote[] = ["must_do", "interested"];
const CHOICES: { vote: Vote; label: string; icon: typeof Check }[] = [
  { vote: "must_do", label: "Must do", icon: Star },
  { vote: "interested", label: "I'm in", icon: Check },
  { vote: "not_interested", label: "Skip", icon: X },
  { vote: "done_before", label: "Already done", icon: History },
];
const SHORT: Record<Vote, string> = { must_do: "Must do", interested: "In", neutral: "Neutral", not_interested: "Skip", cannot: "Can't", done_before: "Done" };

export function PicksPanel({
  tripId,
  ownerName,
  myMemberId,
  canManage,
  anonymous,
  members,
  days,
  extras,
  votes: serverVotes,
}: {
  tripId: string;
  ownerName: string;
  myMemberId: string;
  canManage: boolean;
  anonymous: boolean;
  members: Member[];
  days: PickDay[];
  extras: PickExtra[];
  /** candidateId → votes (only your own when the trip votes anonymously). */
  votes: Record<string, { memberId: string; vote: Vote }[]>;
}) {
  const toast = useToast();
  const [view, setView] = useState<"mine" | "everyone" | "plans">("mine");
  const [actingFor, setActingFor] = useState(myMemberId);
  const [planFor, setPlanFor] = useState(myMemberId);
  // Optimistic votes, keyed by candidate then member; server data replaces them on the next render.
  const [local, setLocal] = useState<Record<string, Record<string, Vote | null>>>({});
  const [localCandidates, setLocalCandidates] = useState<Record<string, string>>({});
  const [, start] = useTransition();

  const voteOf = (candidateId: string | null, memberId: string): Vote | undefined => {
    if (!candidateId) return undefined;
    const o = local[candidateId];
    if (o && memberId in o) return o[memberId] ?? undefined;
    return serverVotes[candidateId]?.find((v) => v.memberId === memberId)?.vote;
  };
  const candidateFor = (activityId: string, candidateId: string | null) => candidateId ?? localCandidates[activityId] ?? null;
  const unjoined = members.filter((m) => !m.joined && m.id !== myMemberId);
  const actingName = members.find((m) => m.id === actingFor)?.name ?? "you";

  const setVote = (candidateId: string, vote: Vote) => {
    const current = voteOf(candidateId, actingFor);
    const next = current === vote ? null : vote;
    setLocal((s) => ({ ...s, [candidateId]: { ...s[candidateId], [actingFor]: next } }));
    start(async () => {
      const r = await castVote(candidateId, next, actingFor === myMemberId ? undefined : actingFor);
      if (!r.ok) {
        toast({ tone: "error", title: r.error });
        setLocal((s) => ({ ...s, [candidateId]: { ...s[candidateId], [actingFor]: current ?? null } }));
      }
    });
  };

  const pickExtra = (e: PickExtra, vote: Vote) => {
    const existing = candidateFor(e.activityId, e.candidateId);
    if (existing) return setVote(existing, vote);
    start(async () => {
      const r = await addCandidate(tripId, e.activityId);
      if (!r.ok) return toast({ tone: "error", title: r.error });
      setLocalCandidates((s) => ({ ...s, [e.activityId]: r.candidateId }));
      // Adding it counts as "I'm in" for you; anything else (or a vote for someone else) is recorded on top.
      if (vote !== "interested" || actingFor !== myMemberId) {
        setLocal((s) => ({ ...s, [r.candidateId]: { ...s[r.candidateId], [actingFor]: vote } }));
        const v = await castVote(r.candidateId, vote, actingFor === myMemberId ? undefined : actingFor);
        if (!v.ok) toast({ tone: "error", title: v.error });
      } else setLocal((s) => ({ ...s, [r.candidateId]: { ...s[r.candidateId], [myMemberId]: "interested" } }));
    });
  };

  // Consecutive days in one place form a stop; extra ideas for a place are offered once, after its first stop.
  const stops = useMemo(() => {
    const out: { destinationId: string | null; name: string | null; days: PickDay[] }[] = [];
    for (const d of days) {
      const last = out.at(-1);
      if (last && last.destinationId === d.destinationId) last.days.push(d);
      else out.push({ destinationId: d.destinationId, name: d.destinationName, days: [d] });
    }
    const seen = new Set<string>();
    return out.map((s) => {
      const first = !!s.destinationId && !seen.has(s.destinationId);
      if (s.destinationId) seen.add(s.destinationId);
      return { ...s, extras: first ? extras.filter((e) => e.destinationId === s.destinationId) : [] };
    });
  }, [days, extras]);
  const dayNumber = new Map(days.map((d, i) => [d.id, i + 1]));

  return (
    <div>
      <div className="rounded-md border border-line bg-surface p-5">
        <h2 className="font-sans text-base font-semibold">How picking works</h2>
        <ol className="mt-2 grid gap-2 text-sm text-muted md:grid-cols-4">
          <li><strong className="text-ink">1.</strong> {ownerName}'s itinerary is the base plan. You're in for everything unless you say otherwise.</li>
          <li><strong className="text-ink">2.</strong> Mark <em>Skip</em> or <em>Already done</em> on anything you don't want, and <em>Must do</em> on favourites.</li>
          <li><strong className="text-ink">3.</strong> Under each place, add anything else you'd like to do there.</li>
          <li><strong className="text-ink">4.</strong> Everyone's picks are visible, and {ownerName} turns them into each person's plan.</li>
        </ol>
      </div>

      <div className="z-10 -mx-4 mt-5 md:sticky md:top-[7.25rem] flex flex-col gap-3 border-b border-line bg-bg/95 px-4 py-3 backdrop-blur md:mx-0 md:flex-row md:items-center md:justify-between md:px-0">
        <div className="flex flex-wrap gap-1.5" role="group" aria-label="View">
          {(
            [
              ["mine", "My picks"],
              ["everyone", "Who's in"],
              ["plans", "Personal plans"],
            ] as const
          ).map(([k, l]) => (
            <button key={k} type="button" aria-pressed={view === k} onClick={() => setView(k)} className={cn("h-9 rounded-full border px-4 text-sm font-medium", view === k ? "border-brand bg-brand text-brand-ink" : "border-line bg-surface text-muted hover:text-ink")}>
              {l}
            </button>
          ))}
        </div>
        {view === "mine" && canManage && unjoined.length > 0 && (
          <label className="flex items-center gap-2 text-sm">
            <span className="text-muted">Picking for</span>
            <select className="field h-9 w-auto" value={actingFor} onChange={(e) => setActingFor(e.target.value)}>
              <option value={myMemberId}>Me</option>
              {unjoined.map((m) => <option key={m.id} value={m.id}>{m.name} (not joined)</option>)}
            </select>
          </label>
        )}
        {view === "plans" && (
          <div className="flex items-center gap-2">
            <label className="flex items-center gap-2 text-sm">
              <span className="text-muted">Plan for</span>
              <select className="field h-9 w-auto" value={planFor} onChange={(e) => setPlanFor(e.target.value)}>
                {members.map((m) => <option key={m.id} value={m.id}>{m.id === myMemberId ? `${m.name} (me)` : m.name}</option>)}
              </select>
            </label>
            <Button size="sm" variant="outline" onClick={() => window.print()}><Printer className="size-4" /> Print</Button>
          </div>
        )}
      </div>

      {canManage && <BuildPlans tripId={tripId} />}

      {view === "mine" && (
        <div className="mt-6 space-y-8">
          {actingFor !== myMemberId && <p className="rounded-md bg-highlight-soft px-4 py-2.5 text-sm">You're recording picks for <strong>{actingName}</strong>. They can change them after joining.</p>}
          {stops.map((s, si) => (
            <section key={si} aria-label={s.name ?? "Stop"} className="space-y-4">
              {s.days.map((d) => (
                <DayCard key={d.id} day={d} n={dayNumber.get(d.id)!}>
                  {d.items.map((i) =>
                    i.candidateId ? (
                      <ActivityRow key={i.id} item={i} members={members} anonymous={anonymous} mine={voteOf(i.candidateId, actingFor)} voteOf={(m) => voteOf(i.candidateId, m)} onVote={(v) => setVote(i.candidateId!, v)} who={actingFor === myMemberId ? "you" : actingName} actingFor={actingFor} />
                    ) : (
                      <PlainRow key={i.id} item={i} />
                    ),
                  )}
                </DayCard>
              ))}
              {s.extras.length > 0 && (
                <Extras
                  name={s.name ?? "this stop"}
                  extras={s.extras}
                  members={members}
                  anonymous={anonymous}
                  candidateFor={candidateFor}
                  voteOf={voteOf}
                  actingFor={actingFor}
                  onPick={pickExtra}
                />
              )}
            </section>
          ))}
        </div>
      )}

      {view === "everyone" && (anonymous ? (
        <p className="mt-6 rounded-md border border-line bg-surface p-5 text-sm text-muted">This trip votes anonymously, so individual picks are hidden. The owner can switch to named votes under Members & invites.</p>
      ) : (
        <WhoIsIn days={days} extras={extras} members={members} voteOf={voteOf} candidateFor={candidateFor} dayNumber={dayNumber} />
      ))}

      {view === "plans" && <PersonalPlan days={days} extras={extras} member={members.find((m) => m.id === planFor)!} anonymous={anonymous && planFor !== myMemberId} voteOf={voteOf} candidateFor={candidateFor} dayNumber={dayNumber} />}
    </div>
  );
}

function DayCard({ day, n, children }: { day: PickDay; n: number; children: React.ReactNode }) {
  return (
    <article className="overflow-hidden rounded-md border border-line bg-surface">
      <header className="bg-brand px-4 py-3 text-brand-ink">
        <p className="text-xs font-semibold tracking-wide uppercase opacity-80">Day {n} · {formatDay(day.date)}{day.destinationName ? ` · ${day.destinationName}` : ""}</p>
        <h3 className="mt-0.5 font-serif text-xl">{day.title ?? "Free day"}</h3>
      </header>
      {day.notes && <p className="border-b border-line bg-highlight-soft px-4 py-2.5 text-sm">{day.notes}</p>}
      <ul className="divide-y divide-line">{children}</ul>
    </article>
  );
}

function TimeCol({ item }: { item: PickItem }) {
  return (
    <div className="w-16 shrink-0 text-sm font-semibold text-brand tabular-nums">
      {item.time ?? "Any time"}
      {item.durationMin ? <span className="block text-xs font-normal text-muted">{formatDuration(item.durationMin)}</span> : null}
    </div>
  );
}

function PlainRow({ item }: { item: PickItem }) {
  return (
    <li className="flex gap-3 px-4 py-3 text-sm">
      <TimeCol item={item} />
      <div className="min-w-0">
        <p className="font-medium">{item.title}</p>
        {item.notes && <p className="mt-0.5 text-muted">{item.notes}</p>}
      </div>
    </li>
  );
}

function ActivityRow({
  item,
  members,
  anonymous,
  mine,
  voteOf,
  onVote,
  who,
  actingFor,
}: {
  item: PickItem;
  members: Member[];
  anonymous: boolean;
  mine: Vote | undefined;
  voteOf: (memberId: string) => Vote | undefined;
  onVote: (v: Vote) => void;
  who: string;
  actingFor: string;
}) {
  // The itinerary decides who an item is for (everyone, unless narrowed); votes then take people out of it.
  const party = item.participants ? members.filter((m) => item.participants!.includes(m.id)) : members;
  const out = party.filter((m) => {
    const v = voteOf(m.id);
    return v && OUT.includes(v);
  });
  const going = party.length - out.length;
  return (
    <li className="flex gap-3 px-4 py-3.5">
      <TimeCol item={item} />
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-baseline justify-between gap-x-3">
          <p className="font-medium">
            {item.slug ? <Link href={`/experiences/${item.slug}`} className="hover:underline">{item.title}</Link> : item.title}
          </p>
          <p className="text-xs text-muted">{going} of {members.length} going</p>
        </div>
        {item.notes && <p className="mt-0.5 text-sm text-muted">{item.notes}</p>}
        <VoteButtons label={`${who === "you" ? "Your" : `${who}'s`} pick for ${item.title}`} current={mine} onVote={onVote} defaultIn={!item.participants || item.participants.includes(actingFor)} />
        {!anonymous && out.length > 0 && (
          <p className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted">
            {out.map((m) => (
              <span key={m.id} className="inline-flex items-center gap-1">
                <Avatar name={m.name} color={m.color} size={18} muted />
                {m.name}: {SHORT[voteOf(m.id)!]}
              </span>
            ))}
          </p>
        )}
      </div>
    </li>
  );
}

function VoteButtons({ label, current, onVote, defaultIn }: { label: string; current: Vote | undefined; onVote: (v: Vote) => void; defaultIn?: boolean }) {
  return (
    <div className="mt-2.5 flex flex-wrap items-center gap-1.5" role="radiogroup" aria-label={label}>
      {CHOICES.map(({ vote, label: l, icon: Icon }) => {
        const on = current === vote;
        const implied = !current && defaultIn && vote === "interested";
        return (
          <button
            key={vote}
            type="button"
            role="radio"
            aria-checked={on}
            onClick={() => onVote(vote)}
            className={cn(
              "inline-flex h-8 items-center gap-1 rounded-full border px-3 text-xs font-medium",
              on ? (OUT.includes(vote) ? "border-ink bg-ink text-bg" : "border-brand bg-brand text-brand-ink") : implied ? "border-brand/60 text-brand" : "border-line hover:border-ink",
            )}
          >
            <Icon className="size-3.5" aria-hidden />
            {l}
            {implied && <span className="sr-only"> (default)</span>}
          </button>
        );
      })}
      {current && !CHOICES.some((c) => c.vote === current) && <span className="text-xs text-muted">Currently: {VOTE_LABELS[current]}</span>}
    </div>
  );
}

function Extras({
  name,
  extras,
  members,
  anonymous,
  candidateFor,
  voteOf,
  actingFor,
  onPick,
}: {
  name: string;
  extras: PickExtra[];
  members: Member[];
  anonymous: boolean;
  candidateFor: (activityId: string, candidateId: string | null) => string | null;
  voteOf: (candidateId: string | null, memberId: string) => Vote | undefined;
  actingFor: string;
  onPick: (e: PickExtra, v: Vote) => void;
}) {
  const fansOf = (e: PickExtra) => members.filter((m) => {
    const v = voteOf(candidateFor(e.activityId, e.candidateId), m.id);
    return v && IN.includes(v);
  });
  const picked = extras.filter((e) => fansOf(e).length > 0 || voteOf(candidateFor(e.activityId, e.candidateId), actingFor));
  const [open, setOpen] = useState(false);
  const rest = extras.filter((e) => !picked.includes(e));
  return (
    <div className="rounded-md border border-dashed border-line-strong bg-surface p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="font-sans text-base font-semibold"><Sparkles className="mr-1.5 inline size-4 text-accent" aria-hidden />More to do in {name}</h3>
        <Button size="sm" variant="ghost" aria-expanded={open} onClick={() => setOpen((o) => !o)}>
          {open ? "Hide ideas" : `Show ${rest.length} more ideas`}
          <ChevronDown className={cn("size-3.5 transition-transform", open && "rotate-180")} />
        </Button>
      </div>
      {picked.length === 0 && !open && <p className="mt-1 text-sm text-muted">Nobody has added anything here yet. Open the ideas to pick extras, like sea walking or a cooking class.</p>}
      <ul className="mt-2 divide-y divide-line">
        {[...picked, ...(open ? rest : [])].map((e) => {
          const fans = fansOf(e);
          const mine = voteOf(candidateFor(e.activityId, e.candidateId), actingFor);
          return (
            <li key={e.activityId} className="py-3">
              <div className="flex flex-wrap items-baseline justify-between gap-x-3">
                <Link href={`/experiences/${e.slug}`} className="font-medium hover:underline">{e.title}</Link>
                <span className="text-xs text-muted">{formatDuration(e.durationMin)}{" · "}{e.tier === "free" || !e.price || e.price.maxVnd === 0 ? "Free" : <>from <Money vnd={e.price.minVnd} showVnd={false} /></>}</span>
              </div>
              {!anonymous && fans.length > 0 && (
                <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted">
                  {fans.map((m) => (
                    <span key={m.id} className="inline-flex items-center gap-1"><Avatar name={m.name} color={m.color} size={18} />{m.name}</span>
                  ))}
                </p>
              )}
              {mine ? (
                <VoteButtons label={`Pick for ${e.title}`} current={mine} onVote={(v) => onPick(e, v)} />
              ) : (
                <div className="mt-2 flex flex-wrap gap-1.5">
                  <Button size="xs" variant="outline" onClick={() => onPick(e, "interested")}><Plus className="size-3.5" /> Add to my picks</Button>
                  <Button size="xs" variant="ghost" onClick={() => onPick(e, "done_before")}><History className="size-3.5" /> Already done</Button>
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function WhoIsIn({
  days,
  extras,
  members,
  voteOf,
  candidateFor,
  dayNumber,
}: {
  days: PickDay[];
  extras: PickExtra[];
  members: Member[];
  voteOf: (candidateId: string | null, memberId: string) => Vote | undefined;
  candidateFor: (activityId: string, candidateId: string | null) => string | null;
  dayNumber: Map<string, number>;
}) {
  const extraRows = extras.filter((e) => members.some((m) => voteOf(candidateFor(e.activityId, e.candidateId), m.id)));
  const cell = (v: Vote | undefined, base: boolean) => {
    if (!v) return base ? <span className="text-brand" title="Going (default)">✓</span> : <span className="text-line-strong">·</span>;
    if (v === "must_do") return <span className="font-semibold text-brand" title="Must do">★</span>;
    if (v === "interested") return <span className="text-brand" title="In">✓</span>;
    return <span className={cn("text-xs font-medium", v === "done_before" ? "text-accent" : "text-bad")}>{SHORT[v]}</span>;
  };
  return (
    <div className="mt-6 overflow-x-auto rounded-md border border-line bg-surface">
      <table className="w-full min-w-[720px] text-sm">
        <caption className="sr-only">Who is doing each activity</caption>
        <thead>
          <tr className="border-b border-line bg-surface-2 text-left">
            <th scope="col" className="sticky left-0 z-[1] bg-surface-2 px-3 py-2.5 font-semibold">Activity</th>
            {members.map((m) => (
              <th key={m.id} scope="col" className="px-2 py-2.5 text-center font-medium">
                <span className="inline-flex flex-col items-center gap-1"><Avatar name={m.name} color={m.color} size={24} muted={!m.joined} /><span className="max-w-20 truncate text-xs">{m.name}</span></span>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {days.map((d) => {
            const rows = d.items.filter((i) => i.candidateId);
            if (!rows.length) return null;
            return (
              <Fragment key={d.id}>
                <tr className="border-b border-line bg-bg">
                  <th scope="rowgroup" className="sticky left-0 z-[1] bg-bg px-3 py-1.5 text-left text-xs font-semibold tracking-wide text-muted uppercase">Day {dayNumber.get(d.id)} · {formatDay(d.date)}{d.destinationName ? ` · ${d.destinationName}` : ""}</th>
                  {/* Repeated per day so you can still tell the columns apart after scrolling. */}
                  {members.map((m) => <td key={m.id} className="px-2 py-1.5 text-center" title={m.name}><Avatar name={m.name} color={m.color} size={18} muted={!m.joined} /></td>)}
                </tr>
                {rows.map((i) => (
                  <tr key={i.id} className="border-b border-line">
                    <th scope="row" className="sticky left-0 z-[1] bg-surface px-3 py-2 text-left font-normal">{i.title}</th>
                    {members.map((m) => <td key={m.id} className="px-2 py-2 text-center">{cell(voteOf(i.candidateId, m.id), !i.participants || i.participants.includes(m.id))}</td>)}
                  </tr>
                ))}
              </Fragment>
            );
          })}
          {extraRows.length > 0 && (
            <tr className="border-b border-line bg-bg">
              <th colSpan={members.length + 1} scope="colgroup" className="px-3 py-1.5 text-left text-xs font-semibold tracking-wide text-muted uppercase">Extra picks (not in the plan yet)</th>
            </tr>
          )}
          {extraRows.map((e) => (
            <tr key={e.activityId} className="border-b border-line">
              <th scope="row" className="sticky left-0 z-[1] bg-surface px-3 py-2 text-left font-normal">{e.title}</th>
              {members.map((m) => <td key={m.id} className="px-2 py-2 text-center">{cell(voteOf(candidateFor(e.activityId, e.candidateId), m.id), false)}</td>)}
            </tr>
          ))}
        </tbody>
      </table>
      <p className="border-t border-line px-3 py-2 text-xs text-muted">✓ going · ★ must do · Skip · Can't · Done = already done. Base-plan activities count as going until someone says otherwise.</p>
    </div>
  );
}

function PersonalPlan({
  days,
  extras,
  member,
  anonymous,
  voteOf,
  candidateFor,
  dayNumber,
}: {
  days: PickDay[];
  extras: PickExtra[];
  member: Member;
  anonymous: boolean;
  voteOf: (candidateId: string | null, memberId: string) => Vote | undefined;
  candidateFor: (activityId: string, candidateId: string | null) => string | null;
  dayNumber: Map<string, number>;
}) {
  if (anonymous) return <p className="mt-6 rounded-md border border-line bg-surface p-5 text-sm text-muted">This trip votes anonymously, so only your own plan is shown.</p>;
  // An activity is in this person's plan if the itinerary includes them and they haven't opted out of it.
  const inPlan = (i: PickItem) => (i.participants === null || i.participants.includes(member.id)) && !(i.candidateId && OUT.includes(voteOf(i.candidateId, member.id) as Vote));
  const scheduled = new Set(days.flatMap((d) => d.items.map((i) => i.activityId)));
  const waiting = extras.filter((e) => !scheduled.has(e.activityId) && IN.includes(voteOf(candidateFor(e.activityId, e.candidateId), member.id) as Vote));
  const skipped = days.flatMap((d) => d.items.filter((i) => i.candidateId && !inPlan(i)));
  return (
    <div className="mt-6 space-y-4 print:mt-0">
      <div className="flex items-center gap-3">
        <Avatar name={member.name} color={member.color} size={40} />
        <div>
          <h2 className="font-serif text-2xl">{member.name}'s plan</h2>
          <p className="text-sm text-muted">{skipped.length ? `Sitting out ${skipped.length} activit${skipped.length === 1 ? "y" : "ies"}` : "Doing the full base plan"}{waiting.length ? ` · ${waiting.length} extra pick${waiting.length === 1 ? "" : "s"} to be scheduled` : ""}</p>
        </div>
      </div>
      {waiting.length > 0 && (
        <div className="rounded-md border border-accent/40 bg-surface p-4 text-sm">
          <p className="font-semibold">Extra picks waiting for a slot</p>
          <p className="mt-0.5 text-muted">They get a day in the itinerary when the trip owner builds the personal plans.</p>
          <ul className="mt-2 list-disc pl-5">{waiting.map((e) => <li key={e.activityId}>{e.title}</li>)}</ul>
        </div>
      )}
      {days.map((d) => {
        const items = d.items.filter(inPlan);
        return (
          <DayCard key={d.id} day={d} n={dayNumber.get(d.id)!}>
            {items.length ? items.map((i) => <PlainRow key={i.id} item={i} />) : <li className="px-4 py-3 text-sm text-muted">Free day.</li>}
          </DayCard>
        );
      })}
    </div>
  );
}

function BuildPlans({ tripId }: { tripId: string }) {
  const toast = useToast();
  const [pending, start] = useTransition();
  const [preview, setPreview] = useState<PlanSummary | null>(null);
  const runIt = (apply: boolean) =>
    start(async () => {
      const r = await generatePersonalPlans(tripId, { apply });
      if (!r.ok) return toast({ tone: "error", title: r.error });
      if (!apply) setPreview(r);
      else {
        setPreview(null);
        toast({ tone: "success", title: r.applied ? "Personal plans updated" : "Nothing to change: the itinerary already matches everyone's picks" });
      }
    });
  const empty = preview && !preview.updated.length && !preview.added.length;
  return (
    <div className="mt-5 flex flex-col gap-3 rounded-md border border-brand/30 bg-surface-2 p-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="text-sm">
        <p className="font-semibold">Build everyone's personal plans</p>
        <p className="text-muted">Applies the picks to the itinerary: who goes to each activity, and extra picks placed on a day at that place. You can still edit anything afterwards.</p>
      </div>
      <div className="flex shrink-0 gap-2">
        <ButtonLink href="/trip" variant="outline" size="sm">Open itinerary</ButtonLink>
        <Button size="sm" disabled={pending} onClick={() => runIt(false)}>{pending ? "Working…" : "Preview changes"}</Button>
      </div>
      <Dialog
        open={!!preview}
        onClose={() => setPreview(null)}
        title="Build personal plans"
        description={empty ? "The itinerary already matches everyone's picks." : "Check the changes, then apply them to the itinerary."}
        size="lg"
        footer={
          <>
            <Button variant="ghost" onClick={() => setPreview(null)}>Cancel</Button>
            {!empty && <Button disabled={pending} onClick={() => runIt(true)}>{pending ? "Applying…" : "Apply to itinerary"}</Button>}
          </>
        }
      >
        {preview && (
          <div className="space-y-4 text-sm">
            <Section title="Who's going changes" items={preview.updated.map((u) => `${formatDay(u.date)}: ${u.title} (${u.going} going)`)} />
            <Section title="Extra picks added" items={preview.added.map((a) => `${formatDay(a.date)}: ${a.title} (${a.going} going, time to be set)`)} />
            <Section title="Nobody is doing these any more" tone="warn" items={preview.nobodyGoing.map((n) => `${formatDay(n.date)}: ${n.title}. Kept in the plan; remove it if you agree.`)} />
            <Section title="Couldn't place" tone="warn" items={preview.unplaced.map((u) => `${u.title}: ${u.reason === "no_day" ? "the route doesn't stop there" : "the days there are already full"}`)} />
          </div>
        )}
      </Dialog>
    </div>
  );
}

function Section({ title, items, tone }: { title: string; items: string[]; tone?: "warn" }) {
  if (!items.length) return null;
  return (
    <div>
      <p className={cn("font-semibold", tone === "warn" && "text-warn")}>{title} ({items.length})</p>
      <ul className="mt-1 list-disc space-y-0.5 pl-5 text-muted">{items.map((x, i) => <li key={i}>{x}</li>)}</ul>
    </div>
  );
}
