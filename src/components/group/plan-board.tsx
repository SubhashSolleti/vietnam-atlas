"use client";

/**
 * The board: one person's version of the trip, built on the owner's base plan.
 *
 *   Ideas  |  Day 1  |  Day 2  | … |  Day 14  |  Not doing
 *
 * Day columns start as the base plan. Drag an activity to "Not doing" to skip it (or mark it already done), drag an
 * idea onto a day at that place to add it, and star the ones you'd hate to miss. Every move is also a button, for
 * phones and keyboards. Base-plan activities stay on their own day: the group itinerary decides when they happen.
 */
import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  MouseSensor,
  pointerWithin,
  rectIntersection,
  TouchSensor,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
  type CollisionDetection,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import { Ban, Bus, Check, GripVertical, History, Lightbulb, Plane, Plus, Search, Star, Undo2, UtensilsCrossed, X } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";
import { Money } from "@/components/catalog/price";
import { Avatar } from "@/components/ui/avatar";
import { useToast } from "@/components/ui/toast";
import { isStandIn } from "@/lib/party";
import { dayCapacity } from "@/lib/personal-plans";
import { cn, formatDay, formatDuration } from "@/lib/utils";
import { DayPdfLink, type PlanPdf } from "./base-plan-pdf";
import type { BoardMember, Pick, PickDay, PickExtra, PickItem, Vote } from "./picks-panel";

const OUT: Vote[] = ["not_interested", "cannot", "done_before"];
const IN: Vote[] = ["must_do", "interested"];
const OUT_LABEL: Partial<Record<Vote, string>> = { not_interested: "Skipping", cannot: "Can't make it", done_before: "Already done" };

type CardKind = "base" | "extra" | "idea" | "out" | "joinable";
type DragData = { activityId: string; title: string; kind: CardKind; homeDayId: string | null; place: string | null; durationMin?: number | null };

// Drop on the column under the pointer (a wide card can overlap two); the keyboard has no pointer, so it uses overlap.
const collision: CollisionDetection = (args) => {
  const hits = pointerWithin(args);
  return hits.length ? hits : rectIntersection(args);
};
// Scroll the board gently near its edges, and never the page itself: a fast scroll ran a drag past the column you aimed for.
// (Snapping is off while dragging, or each small step snaps a whole column and the board races to its end.)
const autoScroll = {
  threshold: { x: 0.12, y: 0.1 },
  acceleration: 3,
  canScroll: (el: Element) => el !== document.scrollingElement && el !== document.documentElement && el !== document.body,
};

/** "Days 9–12 and 14": a place's days, as short as possible. */
export function dayRanges(ns: number[]) {
  const runs: string[] = [];
  for (let i = 0; i < ns.length; i++) {
    let j = i;
    while (j + 1 < ns.length && ns[j + 1] === ns[j]! + 1) j++;
    runs.push(j > i ? `${ns[i]}–${ns[j]}` : `${ns[i]}`);
    i = j;
  }
  const label = ns.length === 1 ? "Day" : "Days";
  return runs.length ? `${label} ${runs.length > 1 ? `${runs.slice(0, -1).join(", ")} and ${runs.at(-1)}` : runs[0]}` : "";
}

export function PlanBoard({
  days,
  extras,
  members,
  pdf,
  editable,
  personId,
  personName,
  readOnlyNote,
  groupSize,
  pickOf,
  setPick,
}: {
  days: PickDay[];
  extras: PickExtra[];
  members: BoardMember[];
  pdf: PlanPdf | null;
  /** False when looking at someone else's board. */
  editable: boolean;
  personId: string;
  /** "you", or the traveller's name. */
  personName: string;
  /** Shown above a board you can't change, saying who can. */
  readOnlyNote?: React.ReactNode;
  /** Everyone expected on the trip; those not joined yet count as going to base-plan activities. */
  groupSize: number;
  pickOf: (activityId: string, memberId: string) => Pick | undefined;
  setPick: (activityId: string, vote: Vote | null, dayId?: string | null) => void;
}) {
  const toast = useToast();
  const [drag, setDrag] = useState<DragData | null>(null);
  const [place, setPlace] = useState<string>("all");
  const [query, setQuery] = useState("");
  const [shown, setShown] = useState(30);
  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 220, tolerance: 8 } }),
    useSensor(KeyboardSensor),
  );

  const dayN = useMemo(() => new Map(days.map((d, i) => [d.id, i + 1])), [days]);
  const places = useMemo(() => {
    const seen = new Map<string, { id: string; name: string; dayIds: string[] }>();
    for (const d of days) {
      if (!d.destinationId) continue;
      const p = seen.get(d.destinationId) ?? { id: d.destinationId, name: d.destinationName ?? "This stop", dayIds: [] };
      p.dayIds.push(d.id);
      seen.set(d.destinationId, p);
    }
    return [...seen.values()];
  }, [days]);
  const placeName = (id: string | null) => places.find((p) => p.id === id)?.name ?? "that stop";
  const daysAt = (placeId: string | null) => days.filter((d) => d.destinationId === placeId);
  const range = (placeId: string | null) => dayRanges(daysAt(placeId).map((d) => dayN.get(d.id)!));

  // Where each activity sits on this person's board.
  const scheduled = useMemo(() => new Set(days.flatMap((d) => d.items.flatMap((i) => (i.activityId ? [i.activityId] : [])))), [days]);
  const mine = (activityId: string) => pickOf(activityId, personId);
  const isOut = (v: Vote | undefined) => !!v && OUT.includes(v);
  const isIn = (v: Vote | undefined) => !!v && IN.includes(v);
  const includes = (i: PickItem) => i.participants === null || i.participants.includes(personId);
  const extrasOnDay = (d: PickDay) =>
    extras.filter((e) => {
      if (scheduled.has(e.activityId) || e.destinationId !== d.destinationId) return false;
      const p = mine(e.activityId);
      if (!isIn(p?.vote)) return false;
      // A pick without a day (or whose day moved elsewhere) shows on the first day at that place.
      const chosen = p!.dayId && daysAt(e.destinationId).some((x) => x.id === p!.dayId) ? p!.dayId : daysAt(e.destinationId)[0]?.id;
      return chosen === d.id;
    });
  // Minutes this person is busy on a day, counted the way the plan builder counts them.
  const loadOf = (d: PickDay, extra = 0) =>
    d.items.reduce((sum, i) => (i.type === "note" || i.type === "accommodation" || !includes(i) || (i.activityId && i.type === "activity" && isOut(mine(i.activityId)?.vote)) ? sum : sum + (i.durationMin ?? 0)), 0) +
    extrasOnDay(d).reduce((sum, e) => sum + e.durationMin, 0) +
    extra;
  const capacityOf = (d: PickDay) => dayCapacity({ isFirst: d.id === days[0]?.id, isLast: d.id === days.at(-1)?.id }, d.items.map((i) => ({ type: i.type, startTime: i.time })));
  const notDoing = [
    ...days.flatMap((d) => d.items.filter((i) => i.activityId && i.type === "activity" && isOut(mine(i.activityId)?.vote)).map((i) => ({ i, d }))),
  ];
  const notDoingExtras = extras.filter((e) => !scheduled.has(e.activityId) && isOut(mine(e.activityId)?.vote));
  const ideas = extras.filter((e) => !scheduled.has(e.activityId) && !mine(e.activityId)?.vote);
  const q = query.trim().toLocaleLowerCase();
  const filteredIdeas = ideas.filter((e) => (place === "all" || e.destinationId === place) && (!q || e.title.toLocaleLowerCase().includes(q)));

  const fansOf = (activityId: string) => members.filter((m) => isIn(pickOf(activityId, m.id)?.vote));
  const goingTo = (i: PickItem) => (i.participants ? members.filter((m) => i.participants!.includes(m.id)) : members).filter((m) => !isOut(pickOf(i.activityId!, m.id)?.vote));
  // People expected but not joined yet: going unless the itinerary already says otherwise.
  const notJoinedGoing = (i: PickItem) => (i.participants ? i.participants.filter(isStandIn).length : Math.max(0, groupSize - members.length));

  /* ── Moves (shared by drag and drop and the buttons) ── */
  const toDay = (d: DragData, dayId: string) => {
    if (d.kind === "base" || d.kind === "joinable" || (d.kind === "out" && d.homeDayId)) {
      if (d.homeDayId !== dayId) {
        toast({ tone: "info", title: `${d.title} is on Day ${dayN.get(d.homeDayId!)} in the base plan`, description: "Base-plan activities stay on their day. Ask the owner if it should move for everyone." });
        return;
      }
      if (d.kind === "out") setPick(d.activityId, null);
      if (d.kind === "joinable") setPick(d.activityId, "interested");
      return;
    }
    const day = days.find((x) => x.id === dayId)!;
    if (day.destinationId !== d.place) {
      toast({ tone: "info", title: `${d.title} is in ${placeName(d.place)}`, description: `Drop it on a ${placeName(d.place)} day (${range(d.place)}).` });
      return;
    }
    const current = mine(d.activityId)?.vote;
    setPick(d.activityId, current === "must_do" ? "must_do" : "interested", dayId);
    added(d, day);
  };
  /** Says where an idea went, and warns when the day looks too full for it. */
  const added = (d: { title: string; activityId: string; durationMin?: number | null }, day: PickDay) => {
    const already = extrasOnDay(day).some((e) => e.activityId === d.activityId);
    const load = loadOf(day, already ? 0 : (d.durationMin ?? 0));
    const others = daysAt(day.destinationId).length > 1;
    const cap = capacityOf(day);
    if (load > cap)
      toast({
        tone: "info",
        title: `Added to Day ${dayN.get(day.id)}, but it looks full`,
        description: `${cap < 12 * 60 ? `There's only about ${Math.round(cap / 60)}h around the flights that day` : `That's about ${Math.round(load / 60)}h planned`}. ${others ? `If it doesn't fit, the plan builder puts it on another ${placeName(day.destinationId)} day.` : "Consider skipping something that day."}`,
      });
    else toast({ tone: "success", title: `${d.title} added to Day ${dayN.get(day.id)}` });
  };
  const addIdea = (e: PickExtra, dayId: string) => {
    setPick(e.activityId, mine(e.activityId)?.vote === "must_do" ? "must_do" : "interested", dayId);
    added(e, days.find((x) => x.id === dayId)!);
  };
  const toOut = (d: DragData, vote: Vote = "not_interested") => setPick(d.activityId, vote, d.kind === "base" || d.homeDayId ? undefined : null);
  const toIdeas = (d: DragData) => {
    if (d.kind === "base" || d.kind === "joinable" || d.homeDayId) {
      toast({ tone: "info", title: "Base-plan activities stay on their day", description: "Drag it to Not doing to skip it instead." });
      return;
    }
    setPick(d.activityId, null, null);
  };

  const onDragStart = (e: DragStartEvent) => setDrag(e.active.data.current as DragData);
  const onDragEnd = (e: DragEndEvent) => {
    setDrag(null);
    const d = e.active.data.current as DragData | undefined;
    const target = e.over?.id ? String(e.over.id) : null;
    if (!d || !target) return;
    if (target.startsWith("day:")) toDay(d, target.slice(4));
    else if (target === "out") {
      if (d.kind !== "out") toOut(d);
    } else if (target === "ideas" && d.kind !== "idea") toIdeas(d);
  };
  const validDay = (dayId: string) => {
    if (!drag) return null;
    const day = days.find((x) => x.id === dayId)!;
    if (drag.kind === "base" || drag.kind === "joinable" || (drag.kind === "out" && drag.homeDayId)) return drag.homeDayId === dayId;
    return day.destinationId === drag.place;
  };
  const announcements = {
    onDragStart: ({ active }: { active: { data: { current?: unknown } } }) => `Picked up ${(active.data.current as DragData).title}.`,
    onDragOver: ({ over }: { over: { id: string | number } | null }) => (over ? `Over ${columnName(String(over.id))}.` : "Not over a column."),
    onDragEnd: ({ over, active }: { over: { id: string | number } | null; active: { data: { current?: unknown } } }) => {
      const d = active.data.current as DragData;
      if (!over) return `${d.title} dropped outside the board. Nothing changed.`;
      const id = String(over.id);
      const ok = !id.startsWith("day:") || (d.kind === "base" || d.kind === "joinable" || (d.kind === "out" && d.homeDayId) ? d.homeDayId === id.slice(4) : days.find((x) => x.id === id.slice(4))?.destinationId === d.place);
      return ok ? `${d.title} moved to ${columnName(id)}.` : `${d.title} can't go on ${columnName(id)}. Nothing changed.`;
    },
    onDragCancel: ({ active }: { active: { data: { current?: unknown } } }) => `Cancelled. ${(active.data.current as DragData).title} stays where it was.`,
  };
  const columnName = (id: string) => (id === "out" ? "Not doing" : id === "ideas" ? "Ideas" : `Day ${dayN.get(id.slice(4))}`);

  const jump = (id: string) => document.getElementById(id)?.scrollIntoView({ behavior: "smooth", inline: "start", block: "nearest" });

  return (
    <div className="mt-6">
      <div className="mb-3 flex flex-wrap items-center gap-1.5 text-xs" aria-label="Jump to a column">
        <span className="mr-1 text-muted">Jump to</span>
        <button type="button" onClick={() => jump("col-ideas")} className="inline-flex h-8 items-center rounded-full border border-line bg-surface px-3 font-medium hover:border-ink">Ideas</button>
        {days.map((d) => (
          <button key={d.id} type="button" onClick={() => jump(`col-${d.id}`)} className="inline-flex h-8 min-w-8 items-center justify-center rounded-full border border-line bg-surface px-2 tabular-nums hover:border-ink" title={`${formatDay(d.date)}${d.destinationName ? ` · ${d.destinationName}` : ""}`}>
            {dayN.get(d.id)}
          </button>
        ))}
        <button type="button" onClick={() => jump("col-out")} className="inline-flex h-8 items-center rounded-full border border-line bg-surface px-3 font-medium hover:border-ink">Not doing</button>
      </div>
      {!editable && <p className="mb-3 rounded-md bg-surface-2 px-4 py-2.5 text-sm">{readOnlyNote ?? <>You're looking at <strong>{personName}</strong>'s board. Only they can change it.</>}</p>}

      <DndContext
        id="plan-board"
        sensors={sensors}
        collisionDetection={collision}
        autoScroll={autoScroll}
        onDragStart={onDragStart}
        onDragEnd={onDragEnd}
        onDragCancel={() => setDrag(null)}
        accessibility={{ announcements, screenReaderInstructions: { draggable: "To move an activity, press space or enter, use the arrow keys to reach a column, then press space or enter to drop it. Press escape to cancel. Every move is also available from the buttons on the card." } }}
      >
        <div className={cn("-mx-4 flex gap-3 overflow-x-auto px-4 pb-4 md:mx-0 md:snap-none md:px-0", !drag && "snap-x snap-mandatory")} role="list" aria-label={`${personName === "you" ? "Your" : `${personName}'s`} board`}>
          {/* Ideas */}
          <Column id="ideas" domId="col-ideas" tone="ideas" highlight={drag ? (drag.kind === "extra" || drag.kind === "out") && !drag.homeDayId : null}
            header={<><p className="flex items-center gap-1.5 font-semibold"><Lightbulb className="size-4 text-accent" aria-hidden />Ideas</p><p className="text-xs text-muted">{ideas.length} more things to do at places on the route</p></>}>
            <div className="space-y-2 pb-1">
              <label className="relative block">
                <span className="sr-only">Search ideas</span>
                <Search className="pointer-events-none absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-muted" aria-hidden />
                <input value={query} onChange={(e) => { setQuery(e.target.value); setShown(30); }} placeholder="Search, e.g. sea walking" className="field h-9 pl-8 text-sm" />
              </label>
              <label className="block">
                <span className="sr-only">Place</span>
                <select value={place} onChange={(e) => { setPlace(e.target.value); setShown(30); }} className="field h-9 text-sm">
                  <option value="all">All places on the route</option>
                  {places.map((p) => <option key={p.id} value={p.id}>{p.name} ({range(p.id)})</option>)}
                </select>
              </label>
            </div>
            {filteredIdeas.length === 0 && <p className="px-1 py-3 text-sm text-muted">{q ? "Nothing matches that search." : "Every idea here is already on the board."}</p>}
            {filteredIdeas.slice(0, shown).map((e) => (
              <Card key={e.activityId} data={{ activityId: e.activityId, title: e.title, kind: "idea", homeDayId: null, place: e.destinationId, durationMin: e.durationMin }} editable={editable}
                title={e.title} slug={e.slug} meta={<><strong className="font-semibold text-ink">{placeName(e.destinationId)}</strong> · {formatDuration(e.durationMin)} · {priceText(e)}</>} people={fansOf(e.activityId)} peopleLabel="want to do this">
                {editable && (
                  <div className="mt-2 flex flex-wrap items-center gap-1.5">
                    <DayPicker label={`Add ${e.title} to a day`} days={daysAt(e.destinationId)} dayN={dayN} full={(x) => loadOf(x, e.durationMin) > capacityOf(x)} onPick={(dayId) => addIdea(e, dayId)} />
                    <SmallButton onClick={() => setPick(e.activityId, "done_before", null)} icon={History}>Done before</SmallButton>
                  </div>
                )}
              </Card>
            ))}
            {filteredIdeas.length > shown && (
              <button type="button" onClick={() => setShown((n) => n + 30)} className="w-full rounded-md border border-dashed border-line-strong py-2 text-sm font-medium text-muted hover:text-ink">Show more ({filteredIdeas.length - shown})</button>
            )}
          </Column>

          {/* Days */}
          {days.map((d, idx) => {
            const valid = validDay(d.id);
            const extraCards = extrasOnDay(d);
            return (
              <Column key={d.id} id={`day:${d.id}`} domId={`col-${d.id}`} highlight={valid}
                header={
                  <>
                    <div className="flex items-baseline justify-between gap-2">
                      <p className="text-xs font-semibold tracking-wide uppercase opacity-80">Day {idx + 1} · {formatDay(d.date)}</p>
                      {pdf && <DayPdfLink pdf={pdf} dayIndex={idx} title={`Day ${idx + 1} in the itinerary`} className="text-brand-ink" />}
                    </div>
                    <p className="font-serif text-lg leading-tight">{d.title ?? "Free day"}</p>
                    <p className="text-xs opacity-80">{[d.destinationName, `${Math.round(loadOf(d) / 60)}h of ${Math.round(capacityOf(d) / 60)}h planned`].filter(Boolean).join(" · ")}</p>
                  </>
                }
                tone="day">
                {d.notes && <p className="rounded-sm bg-highlight-soft px-2.5 py-2 text-xs">{d.notes}</p>}
                {d.items.map((i) => {
                  if (i.type !== "activity" || !i.activityId) return <FixedRow key={i.id} item={i} />;
                  const p = mine(i.activityId);
                  if (isOut(p?.vote)) return null;
                  const joinable = !includes(i);
                  const data: DragData = { activityId: i.activityId, title: i.title, kind: joinable ? "joinable" : "base", homeDayId: d.id, place: d.destinationId };
                  const going = goingTo(i);
                  return (
                    <Card key={i.id} data={data} editable={editable} muted={joinable} time={i.time} durationMin={i.durationMin} title={i.title} slug={i.slug} star={p?.vote === "must_do"}
                      badge={joinable ? "Others are going" : i.optIn ? "Extra pick" : "Base plan"} accent={!joinable && i.optIn} people={going} count={going.length + notJoinedGoing(i)} peopleLabel="going" total={Math.max(groupSize, members.length)}>
                      {editable && (
                        <div className="mt-2 flex flex-wrap gap-1.5">
                          {joinable ? (
                            <SmallButton onClick={() => setPick(i.activityId!, "interested")} icon={Plus}>Join</SmallButton>
                          ) : (
                            <>
                              <StarButton on={p?.vote === "must_do"} title={i.title} onClick={() => setPick(i.activityId!, p?.vote === "must_do" ? null : "must_do")} />
                              <SmallButton onClick={() => setPick(i.activityId!, "not_interested")} icon={X}>Skip</SmallButton>
                              <SmallButton onClick={() => setPick(i.activityId!, "done_before")} icon={History}>Done before</SmallButton>
                            </>
                          )}
                        </div>
                      )}
                    </Card>
                  );
                })}
                {extraCards.map((e) => {
                  const p = mine(e.activityId);
                  const others = fansOf(e.activityId).filter((m) => m.id !== personId);
                  return (
                    <Card key={e.activityId} data={{ activityId: e.activityId, title: e.title, kind: "extra", homeDayId: null, place: e.destinationId, durationMin: e.durationMin }} editable={editable} accent
                      durationMin={e.durationMin} title={e.title} slug={e.slug} star={p?.vote === "must_do"} badge={personName === "you" ? "Your pick" : `${personName}'s pick`}
                      meta={<>Not in the group plan yet{others.length ? ` · ${others.length} other${others.length === 1 ? "" : "s"} want it` : ""}</>} people={fansOf(e.activityId)} peopleLabel="want to do this">
                      {editable && (
                        <div className="mt-2 flex flex-wrap items-center gap-1.5">
                          <StarButton on={p?.vote === "must_do"} title={e.title} onClick={() => setPick(e.activityId, p?.vote === "must_do" ? "interested" : "must_do")} />
                          {daysAt(e.destinationId).length > 1 && <DayPicker label={`Move ${e.title} to another day`} verb="Move" days={daysAt(e.destinationId).filter((x) => x.id !== d.id)} dayN={dayN} full={(x) => loadOf(x, e.durationMin) > capacityOf(x)} onPick={(dayId) => addIdea(e, dayId)} />}
                          <SmallButton onClick={() => setPick(e.activityId, null, null)} icon={Undo2}>Remove</SmallButton>
                        </div>
                      )}
                    </Card>
                  );
                })}
                {drag && valid === false && <p className="rounded-sm border border-dashed border-line-strong px-2.5 py-2 text-center text-xs text-muted">{drag.homeDayId ? `Stays on Day ${dayN.get(drag.homeDayId)}` : `Not in ${placeName(drag.place)}`}</p>}
              </Column>
            );
          })}

          {/* Not doing */}
          <Column id="out" domId="col-out" tone="out" highlight={drag ? drag.kind !== "out" : null}
            header={<><p className="flex items-center gap-1.5 font-semibold"><Ban className="size-4" aria-hidden />Not doing</p><p className="text-xs text-muted">Skipped, can't make it, or already done</p></>}>
            {notDoing.length + notDoingExtras.length === 0 && <p className="px-1 py-3 text-sm text-muted">{editable ? "Drag anything you'd skip, or have done before, here." : "Nothing skipped."}</p>}
            {notDoing.map(({ i, d }) => {
              const v = mine(i.activityId!)!.vote;
              return (
                <Card key={i.id} data={{ activityId: i.activityId!, title: i.title, kind: "out", homeDayId: d.id, place: d.destinationId }} editable={editable} muted title={i.title} slug={i.slug}
                  badge={OUT_LABEL[v]} meta={<>Day {dayN.get(d.id)} · {formatDay(d.date)}</>}>
                  {editable && <OutButtons vote={v} onVote={(nv) => setPick(i.activityId!, nv)} onBack={() => setPick(i.activityId!, null)} backLabel={`Back to Day ${dayN.get(d.id)}`} />}
                </Card>
              );
            })}
            {notDoingExtras.map((e) => {
              const v = mine(e.activityId)!.vote;
              return (
                <Card key={e.activityId} data={{ activityId: e.activityId, title: e.title, kind: "out", homeDayId: null, place: e.destinationId }} editable={editable} muted title={e.title} slug={e.slug}
                  badge={OUT_LABEL[v]} meta={<>{placeName(e.destinationId)}</>}>
                  {editable && <OutButtons vote={v} onVote={(nv) => setPick(e.activityId, nv, null)} onBack={() => setPick(e.activityId, null, null)} backLabel="Back to ideas" />}
                </Card>
              );
            })}
          </Column>
        </div>
        <DragOverlay>{drag ? <div className="w-64 rotate-1 rounded-md border border-brand bg-surface px-3 py-2 text-sm font-medium shadow-lg">{drag.title}</div> : null}</DragOverlay>
      </DndContext>
      <p className="mt-1 text-xs text-muted">Drag cards between columns, or use the buttons on each card. Picks save as you go; {personName === "you" ? "your" : `${personName}'s`} extra picks join the group itinerary when the owner builds the personal plans.</p>
    </div>
  );
}

function priceText(e: PickExtra) {
  return e.tier === "free" || !e.price || e.price.maxVnd === 0 ? "Free" : <>from <Money vnd={e.price.minVnd} showVnd={false} /></>;
}

function Column({ id, domId, header, children, tone, highlight }: { id: string; domId: string; header: React.ReactNode; children: React.ReactNode; tone: "ideas" | "day" | "out"; highlight: boolean | null }) {
  const { setNodeRef, isOver } = useDroppable({ id });
  return (
    <section
      ref={setNodeRef}
      id={domId}
      role="listitem"
      aria-label={typeof header === "string" ? header : undefined}
      className={cn(
        "flex w-[82vw] max-w-80 shrink-0 snap-start scroll-mt-40 flex-col rounded-md border bg-surface-2 sm:w-72",
        highlight === true && "border-brand ring-2 ring-brand/30",
        highlight === false && "opacity-60",
        highlight === null && "border-line",
        isOver && highlight !== false && "bg-surface",
      )}
    >
      <header className={cn("rounded-t-md px-3 py-2.5", tone === "day" ? "bg-brand text-brand-ink" : "border-b border-line bg-surface")}>{header}</header>
      <div className="flex flex-1 flex-col gap-2 overflow-y-auto overscroll-contain p-2 max-h-[68dvh] md:max-h-[70vh]">{children}</div>
    </section>
  );
}

function Card({
  data,
  editable,
  title,
  slug,
  time,
  durationMin,
  meta,
  badge,
  star,
  muted,
  accent,
  people,
  peopleLabel,
  total,
  count,
  children,
}: {
  data: DragData;
  editable: boolean;
  title: string;
  slug: string | null;
  time?: string | null;
  durationMin?: number | null;
  meta?: React.ReactNode;
  badge?: string;
  star?: boolean;
  muted?: boolean;
  accent?: boolean;
  people?: BoardMember[];
  peopleLabel?: string;
  total?: number;
  /** How many are going, when it's more than the faces shown (people not joined yet). */
  count?: number;
  children?: React.ReactNode;
}) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({ id: `${data.kind}:${data.activityId}`, data, disabled: !editable });
  return (
    <article ref={setNodeRef} className={cn("rounded-md border bg-surface p-2.5 text-sm shadow-xs", accent ? "border-accent/50" : "border-line", muted && "border-dashed bg-surface/70", isDragging && "opacity-40")}>
      <div className="flex items-start gap-1.5">
        {editable && (
          <button type="button" {...listeners} {...attributes} aria-label={`Move ${title}`} className="-my-1 -ml-2 shrink-0 cursor-grab touch-none rounded-sm p-1.5 text-muted hover:text-ink active:cursor-grabbing">
            <GripVertical className="size-4" aria-hidden />
          </button>
        )}
        <div className="min-w-0 flex-1">
          {(time || durationMin || badge) && (
            <p className="flex flex-wrap items-center gap-x-1.5 text-xs text-muted">
              {time && <span className="font-semibold text-brand tabular-nums">{time}</span>}
              {durationMin ? <span>{formatDuration(durationMin)}</span> : null}
              {badge && <span className={cn("rounded-full px-1.5 py-px text-[11px] font-medium", accent ? "bg-accent/15 text-accent" : "bg-surface-2")}>{badge}</span>}
            </p>
          )}
          <p className="mt-0.5 font-medium leading-snug">
            {star && <Star className="mr-1 inline size-3.5 -translate-y-px fill-current text-accent" aria-label="Must do" />}
            {slug ? <Link href={`/experiences/${slug}`} className="hover:underline">{title}</Link> : title}
          </p>
          {meta && <p className="mt-0.5 text-xs text-muted">{meta}</p>}
          {people && (people.length > 0 || !!count) && (
            <p className="mt-1.5 flex items-center gap-1 text-xs text-muted" title={people.map((m) => m.name).join(", ")}>
              <span className="flex -space-x-1">{people.slice(0, 5).map((m) => <Avatar key={m.id} name={m.name} color={m.color} size={18} muted={!m.joined} />)}</span>
              {people.length > 5 && <span>+{people.length - 5}</span>}
              <span>{total && (count ?? people.length) === total ? `Everyone ${peopleLabel}` : total ? `${count ?? people.length} of ${total} ${peopleLabel}` : `${people.length} ${peopleLabel}`}</span>
            </p>
          )}
          {children}
        </div>
      </div>
    </article>
  );
}

function FixedRow({ item }: { item: PickItem }) {
  const Icon = item.type === "transport" ? (/flight|fly|✈/i.test(item.title) ? Plane : Bus) : item.type === "restaurant" ? UtensilsCrossed : Check;
  return (
    <div className="flex items-start gap-2 rounded-md px-1.5 py-1 text-xs text-muted">
      <Icon className="mt-0.5 size-3.5 shrink-0" aria-hidden />
      <p className="min-w-0">
        {item.time && <span className="mr-1 font-semibold tabular-nums">{item.time}</span>}
        <span className="text-ink">{item.title}</span>
      </p>
    </div>
  );
}

function SmallButton({ onClick, icon: Icon, children }: { onClick: () => void; icon: typeof Check; children: React.ReactNode }) {
  return (
    <button type="button" onClick={onClick} className="inline-flex h-9 items-center gap-1 rounded-full border border-line px-3 text-xs font-medium hover:border-ink sm:h-8">
      <Icon className="size-3.5" aria-hidden />
      {children}
    </button>
  );
}

function StarButton({ on, title, onClick }: { on: boolean; title: string; onClick: () => void }) {
  return (
    <button type="button" aria-pressed={on} aria-label={`Must do: ${title}`} onClick={onClick} className={cn("inline-flex h-9 items-center gap-1 rounded-full border px-3 text-xs font-medium sm:h-8", on ? "border-accent bg-accent text-white" : "border-line hover:border-ink")}>
      <Star className={cn("size-3.5", on && "fill-current")} aria-hidden />
      Must do
    </button>
  );
}

function OutButtons({ vote, onVote, onBack, backLabel }: { vote: Vote; onVote: (v: Vote) => void; onBack: () => void; backLabel: string }) {
  return (
    <div className="mt-2 flex flex-wrap gap-1.5">
      <SmallButton onClick={onBack} icon={Undo2}>{backLabel}</SmallButton>
      {vote !== "done_before" ? <SmallButton onClick={() => onVote("done_before")} icon={History}>Done before</SmallButton> : <SmallButton onClick={() => onVote("not_interested")} icon={X}>Just skip</SmallButton>}
    </div>
  );
}

/** "Add to Day 6" for one matching day; a day menu when the place has several. */
function DayPicker({ label, verb = "Add", days, dayN, full, onPick }: { label: string; verb?: string; days: PickDay[]; dayN: Map<string, number>; full?: (d: PickDay) => boolean; onPick: (dayId: string) => void }) {
  if (!days.length) return null;
  if (days.length === 1)
    return (
      <SmallButton onClick={() => onPick(days[0]!.id)} icon={Plus}>
        {verb} to Day {dayN.get(days[0]!.id)}
      </SmallButton>
    );
  return (
    <label className="inline-flex h-9 items-center gap-1 rounded-full border border-line pr-1 pl-3 text-xs font-medium hover:border-ink sm:h-8">
      <Plus className="size-3.5" aria-hidden />
      <select aria-label={label} value="" onChange={(e) => e.target.value && onPick(e.target.value)} className="h-8 bg-transparent pr-1 text-xs font-medium focus:outline-none sm:h-7">
        <option value="">{verb} to day…</option>
        {days.map((d) => <option key={d.id} value={d.id}>Day {dayN.get(d.id)} · {formatDay(d.date)}{full?.(d) ? " (full)" : ""}</option>)}
      </select>
    </label>
  );
}
