"use client";

import { Check, ChevronDown, History, LayoutGrid, List, Plus, Printer, Sparkles, Star, X } from "lucide-react";
import Link from "next/link";
import { Fragment, useEffect, useMemo, useState, useTransition } from "react";
import { generatePersonalPlans, type PlanSummary } from "@/app/actions/plans";
import { pickActivity } from "@/app/actions/trips";
import { Money } from "@/components/catalog/price";
import { Avatar } from "@/components/ui/avatar";
import { Button, ButtonLink } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { useToast } from "@/components/ui/toast";
import { VOTE_LABELS } from "@/content/taxonomy";
import { isStandIn } from "@/lib/party";
import { cn, formatDay, formatDuration } from "@/lib/utils";
import { BasePlanPdf, DayPdfLink, type PlanPdf } from "./base-plan-pdf";
import { boardFor } from "./board-model";
import { PlanBoard } from "./plan-board";

export type Vote = keyof typeof VOTE_LABELS;
/** One person's pick: their vote, and for extras the day they'd like to do it. */
export type Pick = { vote: Vote; dayId: string | null };
export type BoardMember = { id: string; name: string; color: string; joined: boolean };
type Member = BoardMember;
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
  participants: string[] | null;
  /** Added from people's picks: only those who want it go. */
  optIn?: boolean;
};
export type PickDay = { id: string; date: string; title: string | null; notes: string | null; destinationId: string | null; destinationName: string | null; items: PickItem[] };
export type PickExtra = { activityId: string; title: string; slug: string; durationMin: number; tier: "free" | "low" | "paid"; price: PriceInfo; destinationId: string };

const OUT: Vote[] = ["not_interested", "cannot", "done_before"];
const IN: Vote[] = ["must_do", "interested"];
const CHOICES: { vote: Vote; label: string; icon: typeof Check }[] = [
  { vote: "must_do", label: "Must do", icon: Star },
  { vote: "interested", label: "I'm in", icon: Check },
  { vote: "not_interested", label: "Skip", icon: X },
  { vote: "done_before", label: "Already done", icon: History },
];
const SHORT: Record<Vote, string> = { must_do: "Must do", interested: "In", neutral: "Neutral", not_interested: "Skip", cannot: "Can't", done_before: "Done" };
const isActivity = (i: PickItem) => i.type === "activity" && !!i.activityId;

export function PicksPanel({
  tripId,
  ownerName,
  myMemberId,
  canManage,
  anonymous,
  members,
  expectedTravellers,
  days,
  extras,
  pdf,
  votes: serverVotes,
}: {
  tripId: string;
  ownerName: string;
  myMemberId: string;
  canManage: boolean;
  anonymous: boolean;
  members: Member[];
  /** The group size the owner expects (some may not have joined yet). */
  expectedTravellers: number;
  days: PickDay[];
  extras: PickExtra[];
  pdf: PlanPdf | null;
  /** activityId → picks (only your own, plus offline travellers' for owners, when the trip votes anonymously). */
  votes: Record<string, { memberId: string; vote: Vote; dayId: string | null }[]>;
}) {
  const toast = useToast();
  const [view, setView] = useState<"board" | "list" | "everyone" | "plans">("board");
  const [personId, setPersonIdState] = useState(myMemberId);
  // Remember whose board you were looking at, across reloads in this tab.
  const boardKey = `board-of:${tripId}`;
  const setPersonId = (id: string) => {
    setPersonIdState(id);
    try {
      sessionStorage.setItem(boardKey, id);
    } catch {}
  };
  useEffect(() => {
    try {
      const saved = sessionStorage.getItem(boardKey);
      if (saved && members.some((m) => m.id === saved)) setPersonIdState(saved);
    } catch {}
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [boardKey]);
  const [planFor, setPlanFor] = useState(myMemberId);
  // Optimistic picks, keyed by activity then member; server data replaces them on the next render.
  const [local, setLocal] = useState<Record<string, Record<string, Pick | null>>>({});
  const [, start] = useTransition();

  const pickOf = (activityId: string | null, memberId: string): Pick | undefined => {
    if (!activityId) return undefined;
    const o = local[activityId];
    if (o && memberId in o) return o[memberId] ?? undefined;
    const v = serverVotes[activityId]?.find((x) => x.memberId === memberId);
    return v ? { vote: v.vote, dayId: v.dayId } : undefined;
  };
  const voteOf = (activityId: string | null, memberId: string) => pickOf(activityId, memberId)?.vote;
  const person = members.find((m) => m.id === personId) ?? members.find((m) => m.id === myMemberId)!;
  // You edit your own board; owners and editors also edit for travellers who haven't joined online.
  const editable = person.id === myMemberId || (canManage && !person.joined);
  const personName = person.id === myMemberId ? "you" : person.name;
  const readOnlyNote = person.joined
    ? <>You're looking at <strong>{person.name}</strong>'s board. Only they can change it.</>
    : <>You're looking at <strong>{person.name}</strong>'s board. {person.name} hasn't joined online, so {ownerName} picks for them.</>;
  // On anonymous trips you only see your own picks (and, for owners, offline travellers you pick for).
  const viewable = members.filter((m) => m.id === myMemberId || !anonymous || (canManage && !m.joined));

  /** vote null clears the pick. dayId: undefined keeps the chosen day, null clears it. */
  const setPick = (activityId: string, vote: Vote | null, dayId?: string | null) => {
    const who = person.id;
    if (!editable) return;
    const current = pickOf(activityId, who);
    const next: Pick | null = vote ? { vote, dayId: dayId === undefined ? (current?.dayId ?? null) : dayId } : null;
    setLocal((s) => ({ ...s, [activityId]: { ...s[activityId], [who]: next } }));
    start(async () => {
      // A tab opened before the site was updated can't reach the server any more: say so, rather than losing the pick.
      const r = await pickActivity(tripId, activityId, { vote, dayId, onBehalfOf: who === myMemberId ? undefined : who }).catch(() => ({
        ok: false as const,
        error: navigator.onLine ? "That pick wasn't saved. The site may have just been updated: reload the page and try again." : "You're offline, so that pick wasn't saved. Try again when you're back online.",
      }));
      if (!r.ok) {
        toast({ tone: "error", title: r.error });
        setLocal((s) => ({ ...s, [activityId]: { ...s[activityId], [who]: current ?? null } }));
      }
    });
  };
  const setVote = (activityId: string, vote: Vote) => setPick(activityId, voteOf(activityId, person.id) === vote ? null : vote);

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
  // Extra picks (not in the itinerary yet) on the day this person chose, or the first day at that place.
  const scheduledIds = useMemo(() => new Set(days.flatMap((d) => d.items.map((i) => i.activityId))), [days]);
  const placedOn = (d: PickDay, memberId: string) =>
    extras.filter((e) => {
      if (scheduledIds.has(e.activityId) || e.destinationId !== d.destinationId || !IN.includes(voteOf(e.activityId, memberId) as Vote)) return false;
      const at = days.filter((x) => x.destinationId === e.destinationId);
      return (at.find((x) => x.id === pickOf(e.activityId, memberId)?.dayId) ?? at[0])?.id === d.id;
    });
  const dayIndex = new Map(days.map((d, i) => [d.id, i]));
  const joinedCount = members.filter((m) => m.joined).length;

  return (
    <div>
      <details className="group rounded-md border border-line bg-surface">
        <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-5 py-3.5 text-sm [&::-webkit-details-marker]:hidden">
          <span><strong>Your board starts as {ownerName}'s plan.</strong> <span className="text-muted">Make it yours: move, swap, skip or add things on any day. {joinedCount} of {Math.max(expectedTravellers, members.length)} have joined.</span></span>
          <span className="shrink-0 font-medium text-accent group-open:hidden">How it works</span>
          <ChevronDown className="hidden size-4 shrink-0 group-open:block" aria-hidden />
        </summary>
        <ol className="grid gap-2 border-t border-line px-5 py-4 text-sm text-muted md:grid-cols-4">
          <li><strong className="text-ink">1.</strong> Every day starts as {ownerName}'s itinerary (the PDF), and you're in for all of it.</li>
          <li><strong className="text-ink">2.</strong> Drag an activity to another day at the same place, or onto another activity to swap their days. Drag it to <em>Not doing</em> to skip it.</li>
          <li><strong className="text-ink">3.</strong> Drag an idea onto a day to add it, or onto an activity to do it instead. On a phone, use the buttons on each card.</li>
          <li><strong className="text-ink">4.</strong> Your changes are yours only. Everyone can see each other's boards, and {ownerName} turns them into each person's plan.</li>
        </ol>
      </details>
      <div className="mt-4"><BasePlanPdf tripId={tripId} pdf={pdf} ownerName={ownerName} canManage={canManage} compact /></div>

      <div className="z-10 -mx-4 mt-5 flex flex-col gap-3 border-b border-line bg-bg/95 px-4 py-3 backdrop-blur md:sticky md:top-[7.25rem] md:mx-0 md:flex-row md:items-center md:justify-between md:px-0">
        <div className="flex flex-wrap gap-1.5" role="group" aria-label="View">
          {(
            [
              ["board", "Board", LayoutGrid],
              ["list", "List", List],
              ["everyone", "Who's in", null],
              ["plans", "Personal plans", null],
            ] as const
          ).map(([k, l, Icon]) => (
            <button key={k} type="button" aria-pressed={view === k} onClick={() => setView(k)} className={cn("inline-flex h-9 items-center gap-1.5 rounded-full border px-4 text-sm font-medium", view === k ? "border-brand bg-brand text-brand-ink" : "border-line bg-surface text-muted hover:text-ink")}>
              {Icon && <Icon className="size-4" aria-hidden />}
              {l}
            </button>
          ))}
        </div>
        {(view === "board" || view === "list") && viewable.length > 1 && (
          <label className="flex items-center gap-2 text-sm">
            <span className="text-muted">Board of</span>
            <select className="field h-9 w-auto" value={person.id} onChange={(e) => setPersonId(e.target.value)}>
              {viewable.map((m) => <option key={m.id} value={m.id}>{m.id === myMemberId ? `${m.name} (me)` : m.joined ? m.name : `${m.name} (not joined${canManage ? ": you pick" : ""})`}</option>)}
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

      {canManage && <BuildPlans tripId={tripId} joined={joinedCount} expected={Math.max(expectedTravellers, members.length)} />}

      {view === "board" && <PlanBoard days={days} extras={extras} members={members} pdf={pdf} ownerName={ownerName} editable={editable} personId={person.id} personName={personName} readOnlyNote={readOnlyNote} groupSize={Math.max(expectedTravellers, members.length)} pickOf={pickOf} setPick={setPick} />}

      {view === "list" && (
        <div className="mt-6 space-y-8">
          {person.id !== myMemberId && (editable
            ? <p className="rounded-md bg-highlight-soft px-4 py-2.5 text-sm">You're recording picks for <strong>{person.name}</strong>. They can change them after joining.</p>
            : <p className="rounded-md bg-surface-2 px-4 py-2.5 text-sm">{readOnlyNote}</p>)}
          {stops.map((s, si) => (
            <section key={si} aria-label={s.name ?? "Stop"} className="space-y-4">
              {s.days.map((d) => (
                <DayCard key={d.id} day={d} n={dayNumber.get(d.id)!} pdf={pdf} index={dayIndex.get(d.id)!}>
                  {d.items.map((i) =>
                    isActivity(i) ? (
                      <ActivityRow key={i.id} item={i} movedTo={(() => { const p = pickOf(i.activityId, person.id); return !i.optIn && p && IN.includes(p.vote) && p.dayId && p.dayId !== d.id && dayNumber.has(p.dayId) ? `${personName === "you" ? "You do" : `${person.name} does`} this on Day ${dayNumber.get(p.dayId)} instead` : undefined; })()} members={members} anonymous={anonymous} mine={voteOf(i.activityId, person.id)} voteOf={(m) => voteOf(i.activityId, m)} onVote={editable ? (v) => setVote(i.activityId!, v) : undefined} who={personName} actingFor={person.id} groupSize={Math.max(expectedTravellers, members.length)} />
                    ) : (
                      <PlainRow key={i.id} item={i} />
                    ),
                  )}
                  {placedOn(d, person.id).map((e) => (
                    <li key={e.activityId} className="flex gap-3 px-4 py-3.5">
                      <div className="w-16 shrink-0 text-xs text-muted">{formatDuration(e.durationMin)}</div>
                      <div className="min-w-0 flex-1">
                        <p className="font-medium">
                          {voteOf(e.activityId, person.id) === "must_do" && <Star className="mr-1 inline size-3.5 -translate-y-px fill-current text-accent" aria-label="Must do" />}
                          <Link href={`/experiences/${e.slug}`} className="hover:underline">{e.title}</Link>
                          <span className="ml-1.5 rounded-full bg-accent/15 px-1.5 py-px text-[11px] font-medium text-accent">{personName === "you" ? "Your pick" : `${person.name}'s pick`}</span>
                        </p>
                        <p className="mt-0.5 text-sm text-muted">Not in the group plan yet. It joins when {ownerName} builds the personal plans.</p>
                        {editable && <VoteButtons label={`${personName === "you" ? "Your" : `${person.name}'s`} pick for ${e.title}`} current={voteOf(e.activityId, person.id)} onVote={(v) => setVote(e.activityId, v)} />}
                      </div>
                    </li>
                  ))}
                </DayCard>
              ))}
              {s.extras.length > 0 && (
                <Extras name={s.name ?? "this stop"} extras={s.extras} members={members} anonymous={anonymous} voteOf={voteOf} actingFor={person.id} onPick={editable ? (e, v) => setVote(e.activityId, v) : undefined} />
              )}
            </section>
          ))}
        </div>
      )}

      {view === "everyone" && (anonymous ? (
        <p className="mt-6 rounded-md border border-line bg-surface p-5 text-sm text-muted">This trip votes anonymously, so individual picks are hidden. The owner can switch to named votes under Members & invites.</p>
      ) : (
        <WhoIsIn days={days} extras={extras} members={members} voteOf={voteOf} dayNumber={dayNumber} />
      ))}

      {view === "plans" && <PersonalPlan days={days} extras={extras} member={members.find((m) => m.id === planFor)!} anonymous={anonymous && planFor !== myMemberId} pickOf={pickOf} dayNumber={dayNumber} pdf={pdf} dayIndex={dayIndex} />}
    </div>
  );
}

function DayCard({ day, n, pdf, index, children }: { day: PickDay; n: number; pdf: PlanPdf | null; index: number; children: React.ReactNode }) {
  return (
    <article className="overflow-hidden rounded-md border border-line bg-surface">
      <header className="bg-brand px-4 py-3 text-brand-ink">
        <div className="flex items-baseline justify-between gap-3">
          <p className="text-xs font-semibold tracking-wide uppercase opacity-80">Day {n} · {formatDay(day.date)}{day.destinationName ? ` · ${day.destinationName}` : ""}</p>
          {pdf && <span className="print:hidden"><DayPdfLink pdf={pdf} dayIndex={index} title={`Day ${n} in the itinerary`} /></span>}
        </div>
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

function PlainRow({ item, star, note }: { item: PickItem; star?: boolean; note?: string }) {
  return (
    <li className="flex gap-3 px-4 py-3 text-sm">
      <TimeCol item={item} />
      <div className="min-w-0">
        <p className="font-medium">{star && <Star className="mr-1 inline size-3.5 -translate-y-px fill-current text-accent" aria-label="Must do" />}{item.title}</p>
        {item.notes && <p className="mt-0.5 text-muted">{item.notes}</p>}
        {note && <p className="mt-0.5 text-xs text-warn">{note}</p>}
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
  groupSize,
  movedTo,
}: {
  movedTo?: string;
  item: PickItem;
  members: Member[];
  anonymous: boolean;
  mine: Vote | undefined;
  voteOf: (memberId: string) => Vote | undefined;
  /** Missing when looking at someone else's picks. */
  onVote?: (v: Vote) => void;
  who: string;
  actingFor: string;
  groupSize: number;
}) {
  // The itinerary decides who an item is for (everyone, unless narrowed); votes then take people out of it.
  const party = item.participants ? members.filter((m) => item.participants!.includes(m.id)) : members;
  const out = party.filter((m) => {
    const v = voteOf(m.id);
    return v && OUT.includes(v);
  });
  const notJoined = item.participants ? item.participants.filter(isStandIn).length : Math.max(0, groupSize - members.length);
  const going = party.length - out.length + notJoined;
  return (
    <li className="flex gap-3 px-4 py-3.5">
      <TimeCol item={item} />
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-baseline justify-between gap-x-3">
          <p className="font-medium">
            {item.slug ? <Link href={`/experiences/${item.slug}`} className="hover:underline">{item.title}</Link> : item.title}
          </p>
          <p className="text-xs text-muted">{going} of {Math.max(groupSize, members.length)} going</p>
        </div>
        {item.notes && <p className="mt-0.5 text-sm text-muted">{item.notes}</p>}
        {movedTo && <p className="mt-0.5 text-xs font-medium text-accent">{movedTo}</p>}
        {onVote ? (
          <VoteButtons label={`${who === "you" ? "Your" : `${who}'s`} pick for ${item.title}`} current={mine} onVote={onVote} defaultIn={!item.participants || item.participants.includes(actingFor)} />
        ) : (
          <p className="mt-1.5 text-xs font-medium">{mine ? VOTE_LABELS[mine] : !item.participants || item.participants.includes(actingFor) ? "Going (base plan)" : "Not going"}</p>
        )}
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
  voteOf,
  actingFor,
  onPick,
}: {
  name: string;
  extras: PickExtra[];
  members: Member[];
  anonymous: boolean;
  voteOf: (activityId: string | null, memberId: string) => Vote | undefined;
  actingFor: string;
  onPick?: (e: PickExtra, v: Vote) => void;
}) {
  const fansOf = (e: PickExtra) => members.filter((m) => {
    const v = voteOf(e.activityId, m.id);
    return v && IN.includes(v);
  });
  const picked = extras.filter((e) => fansOf(e).length > 0 || voteOf(e.activityId, actingFor));
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
          const mine = voteOf(e.activityId, actingFor);
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
              {!onPick ? (
                mine && <p className="mt-1.5 text-xs font-medium">{VOTE_LABELS[mine]}</p>
              ) : mine ? (
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
  dayNumber,
}: {
  days: PickDay[];
  extras: PickExtra[];
  members: Member[];
  voteOf: (activityId: string | null, memberId: string) => Vote | undefined;
  dayNumber: Map<string, number>;
}) {
  const extraRows = extras.filter((e) => members.some((m) => voteOf(e.activityId, m.id)));
  const cell = (v: Vote | undefined, base: boolean) => {
    if (!v) return base ? <span className="text-brand" title="Going (default)">✓</span> : <span className="text-line-strong">·</span>;
    if (v === "must_do") return <span className="font-semibold text-brand" title="Must do">★</span>;
    if (v === "interested") return <span className="text-brand" title="In">✓</span>;
    return <span className={cn("text-xs font-medium", v === "done_before" ? "text-accent" : "text-bad")}>{SHORT[v]}</span>;
  };
  return (
    <div className="mt-6 overflow-x-auto rounded-md border border-line bg-surface">
      {members.length > 2 && <p className="border-b border-line px-3 py-2 text-xs text-muted sm:hidden">Scroll sideways to see everyone →</p>}
      <table className="w-full text-sm" style={{ minWidth: `${10 + members.length * 3.5}rem` }}>
        <caption className="sr-only">Who is doing each activity</caption>
        <thead>
          <tr className="border-b border-line bg-surface-2 text-left">
            <th scope="col" className="sticky left-0 z-[1] w-40 max-w-40 bg-surface-2 px-3 py-2.5 font-semibold sm:w-auto sm:max-w-none">Activity</th>
            {members.map((m) => (
              <th key={m.id} scope="col" className="px-2 py-2.5 text-center font-medium">
                <span className="inline-flex flex-col items-center gap-1"><Avatar name={m.name} color={m.color} size={24} muted={!m.joined} /><span className="max-w-20 truncate text-xs">{m.name}</span></span>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {days.map((d) => {
            const rows = d.items.filter(isActivity);
            if (!rows.length) return null;
            return (
              <Fragment key={d.id}>
                <tr className="border-b border-line bg-bg">
                  <th scope="rowgroup" className="sticky left-0 z-[1] w-40 max-w-40 bg-bg px-3 py-1.5 text-left text-xs font-semibold tracking-wide text-muted uppercase sm:w-auto sm:max-w-none">Day {dayNumber.get(d.id)} · {formatDay(d.date)}{d.destinationName ? ` · ${d.destinationName}` : ""}</th>
                  {/* Repeated per day so you can still tell the columns apart after scrolling. */}
                  {members.map((m) => <td key={m.id} className="px-2 py-1.5 text-center" title={m.name}><Avatar name={m.name} color={m.color} size={18} muted={!m.joined} /></td>)}
                </tr>
                {rows.map((i) => (
                  <tr key={i.id} className="border-b border-line">
                    <th scope="row" className="sticky left-0 z-[1] w-40 max-w-40 bg-surface px-3 py-2 text-left font-normal sm:w-auto sm:max-w-none">{i.title}</th>
                    {members.map((m) => <td key={m.id} className="px-2 py-2 text-center">{cell(voteOf(i.activityId, m.id), !i.participants || i.participants.includes(m.id))}</td>)}
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
              <th scope="row" className="sticky left-0 z-[1] w-40 max-w-40 bg-surface px-3 py-2 text-left font-normal sm:w-auto sm:max-w-none">{e.title}</th>
              {members.map((m) => <td key={m.id} className="px-2 py-2 text-center">{cell(voteOf(e.activityId, m.id), false)}</td>)}
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
  pickOf,
  dayNumber,
  pdf,
  dayIndex,
}: {
  days: PickDay[];
  extras: PickExtra[];
  member: Member;
  anonymous: boolean;
  pickOf: (activityId: string | null, memberId: string) => Pick | undefined;
  dayNumber: Map<string, number>;
  pdf: PlanPdf | null;
  dayIndex: Map<string, number>;
}) {
  if (anonymous) return <p className="mt-6 rounded-md border border-line bg-surface p-5 text-sm text-muted">This trip votes anonymously, so only your own plan is shown.</p>;
  const vote = (activityId: string | null) => pickOf(activityId, member.id)?.vote;
  // The same placement as their board: moved activities on their new day, skipped ones left out.
  const board = boardFor(days, extras, member.id, (a, m) => pickOf(a, m));
  const skipped = board.out.filter((o) => o.homeDayId).length;
  const moved = board.days.reduce((n, b) => n + b.activities.filter((a) => a.movedFrom).length, 0);
  const waiting = board.days.reduce((n, b) => n + b.extras.length, 0);
  // An extra pick the plan builder had to put on another day than the one they chose.
  const builderMoved = (i: PickItem, d: PickDay) => {
    const chosen = pickOf(i.activityId, member.id)?.dayId;
    return i.optIn && chosen && chosen !== d.id && dayNumber.has(chosen) ? `Picked for Day ${dayNumber.get(chosen)}, which was full, so it's on this day.` : undefined;
  };
  const summary = [
    skipped ? `Sitting out ${skipped} activit${skipped === 1 ? "y" : "ies"}` : "Doing the full base plan",
    moved ? `${moved} moved to another day` : "",
    waiting ? `${waiting} extra pick${waiting === 1 ? "" : "s"}, not in the group itinerary yet` : "",
  ].filter(Boolean);
  return (
    <div className="mt-6 space-y-4 print:mt-0">
      <div className="flex items-center gap-3">
        <Avatar name={member.name} color={member.color} size={40} />
        <div>
          <h2 className="font-serif text-2xl">{member.name}'s plan</h2>
          <p className="text-sm text-muted">{summary.join(" · ")}</p>
        </div>
      </div>
      {board.days.map((b) => {
        const d = b.day;
        const rows = [
          ...b.fixed.filter((i) => i.participants === null || i.participants.includes(member.id)).map((i) => ({ time: i.time, item: i, movedFrom: null as string | null })),
          ...b.activities.filter((a) => !a.joinable).map((a) => ({ time: a.item.time, item: a.item, movedFrom: a.movedFrom })),
        ].sort((x, y) => (x.time ?? "99").localeCompare(y.time ?? "99"));
        return (
          <DayCard key={d.id} day={d} n={dayNumber.get(d.id)!} pdf={pdf} index={dayIndex.get(d.id)!}>
            {rows.map(({ item: i, movedFrom }) => (
              <PlainRow key={i.id} item={i} star={isActivity(i) && vote(i.activityId) === "must_do"}
                note={movedFrom ? `Moved here from Day ${dayNumber.get(movedFrom)}, when the group does it.` : isActivity(i) ? builderMoved(i, d) : undefined} />
            ))}
            {b.extras.map((e) => (
              <li key={e.activityId} className="flex gap-3 px-4 py-3 text-sm">
                <div className="w-16 shrink-0 text-xs text-muted">{formatDuration(e.durationMin)}</div>
                <div className="min-w-0">
                  <p className="font-medium">{vote(e.activityId) === "must_do" && <Star className="mr-1 inline size-3.5 -translate-y-px fill-current text-accent" aria-label="Must do" />}{e.title} <span className="ml-1 rounded-full bg-accent/15 px-1.5 py-px text-[11px] font-medium text-accent">Extra pick</span></p>
                  <p className="mt-0.5 text-muted">Time to be set when the personal plans are built.</p>
                </div>
              </li>
            ))}
            {!rows.length && !b.extras.length && <li className="px-4 py-3 text-sm text-muted">Free day.</li>}
          </DayCard>
        );
      })}
    </div>
  );
}

function BuildPlans({ tripId, joined, expected }: { tripId: string; joined: number; expected: number }) {
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
        <p className="text-muted">Applies everyone's boards to the itinerary: who goes to each activity, and extra picks placed on the day most of their fans chose. You can run it again any time and still edit anything afterwards.</p>
        {joined < expected && <p className="mt-1 font-medium text-warn">{joined} of {expected} have joined. Run it again once everyone has picked, so late joiners are included.</p>}
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
            {joined < expected && <p className="rounded-md bg-highlight-soft px-3 py-2">{joined} of {expected} have joined. The {expected - joined} who haven't count as going to the base plan, and get no extra picks.</p>}
            <Section title="Who's going changes" items={preview.updated.map((u) => `${formatDay(u.date)}: ${u.title} (${u.going} of ${preview.total} going: ${u.who})`)} />
            <Section title="Moved to another day" items={preview.added.filter((a) => a.baseDay).map((a) => `${formatDay(a.date)}: ${a.title} for ${a.who} (the group does it ${formatDay(a.baseDay!)}).`)} />
            <Section title="Extra picks added" items={preview.added.filter((a) => !a.baseDay).map((a) => `${formatDay(a.date)}: ${a.title} (${a.going} of ${preview.total}: ${a.who}). Time to be set${a.movedFrom ? `. Picked for ${formatDay(a.movedFrom)}, which was full` : ""}.`)} />
            <Section title="Nobody is doing these any more" tone="warn" items={preview.nobodyGoing.map((n) => `${formatDay(n.date)}: ${n.title}. Kept in the plan; remove it if you agree.`)} />
            <Section title="Couldn't place" tone="warn" items={preview.unplaced.map((u) => `${u.title}: ${u.reason === "no_day" ? "the route doesn't stop there" : "every day there is already full"}. Ask them to skip something to make room, or add it yourself in the itinerary.`)} />
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
