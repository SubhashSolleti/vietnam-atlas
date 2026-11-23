"use client";

/**
 * The board: one person's own version of the trip, starting from the owner's base plan (their itinerary PDF).
 *
 *   ┌ Ideas ┐  ┌ Day 1 ┐ ┌ Day 2 ┐ ┌ Day 3 ┐
 *   │       │  └───────┘ └───────┘ └───────┘
 *   │       │  ┌ Day 4 ┐ ┌ Day 5 ┐ ┌ Day 6 ┐   … three a row, top to bottom
 *   ├ Not   ┤
 *   └ doing ┘
 *
 * Every day starts as the base plan, with what the PDF says for it. Each person can then, for themselves only:
 * drag an activity to another day at the same place, drop an idea on a day to add it, drop an idea (or another day's
 * activity) on an activity to swap them, drag to Not doing to skip or mark "already done", and star must-dos.
 * Every move is also a button, for phones and keyboards. The owner then builds everyone's personal plans from this.
 */
import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  MeasuringStrategy,
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
import { ArrowLeftRight, Ban, Bus, Check, ChevronDown, FileText, GripVertical, History, Lightbulb, Plane, Plus, Search, Star, Undo2, UtensilsCrossed, X } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Money } from "@/components/catalog/price";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { useToast } from "@/components/ui/toast";
import { isStandIn } from "@/lib/party";
import { dayCapacity } from "@/lib/personal-plans";
import { cn, formatDay, formatDuration } from "@/lib/utils";
import { DayPdfLink, type PlanPdf } from "./base-plan-pdf";
import { boardFor, boardLoad, IN_VOTES, OUT_VOTES, type BoardDay, type PlacedActivity, type PlacedExtra } from "./board-model";
import type { BoardMember, Pick, PickDay, PickExtra, PickItem, Vote } from "./picks-panel";

const OUT_LABEL: Partial<Record<Vote, string>> = { not_interested: "Skipping", cannot: "Can't make it", done_before: "Already done" };

type CardKind = "base" | "extra" | "idea" | "out" | "joinable";
/** What's being dragged. dayId: the day it's on for this person (null for ideas and Not doing). */
type DragData = { activityId: string; title: string; kind: CardKind; dayId: string | null; homeDayId: string | null; place: string | null; durationMin?: number | null };

/** Where the pointer is during a drag (client coordinates), kept by useEdgeScroll. Null for keyboard drags. */
const pointer: { x: number | null; y: number | null } = { x: null, y: null };

// Drop on a card's "Swap" target to swap, else on the box under the pointer. What's under the pointer comes from the
// page itself (elementsFromPoint), not remembered positions: the sticky Ideas and Not doing panels don't move when the
// page scrolls, so their remembered positions drift and drops fell through to the day next to them. The keyboard
// has no pointer: day boxes by overlap.
const collision: CollisionDetection = (args) => {
  const self = `card:${(args.active.data.current as DragData | undefined)?.activityId}`;
  if (pointer.x != null && pointer.y != null) {
    const under = [...new Set(document.elementsFromPoint(pointer.x, pointer.y).flatMap((el) => { const z = el.closest("[data-drop]"); return z ? [z.getAttribute("data-drop")!] : []; }))];
    const id = under.find((z) => z.startsWith("card:") && z !== self) ?? under.find((z) => !z.startsWith("card:"));
    const c = id ? args.droppableContainers.find((x) => x.id === id && !x.disabled) : undefined;
    return c ? [{ id: c.id, data: { droppableContainer: c, value: 0 } }] : [];
  }
  const hits = pointerWithin(args);
  if (hits.length) {
    const cards = hits.filter((h) => String(h.id).startsWith("card:") && h.id !== self);
    return cards.length ? [cards[0]!] : hits.filter((h) => !String(h.id).startsWith("card:"));
  }
  return rectIntersection(args).filter((h) => !String(h.id).startsWith("card:"));
};
/**
 * While dragging, the page scrolls when the pointer is near the top or bottom of the window, so you can reach Day 14.
 * (dnd-kit's own auto-scroll measures the page's edges against the whole document, so it scrolled up to the top
 * whenever you dragged in the upper part of a long page; it's switched off.)
 */
function useEdgeScroll() {
  const state = useRef<{ top: number; raf: number }>({ top: 0, raf: 0 });
  const onMove = useCallback((e: PointerEvent | TouchEvent) => {
    const p = "touches" in e ? e.touches[0] : e;
    pointer.x = p?.clientX ?? null;
    pointer.y = p?.clientY ?? null;
  }, []);
  const tick = useCallback(() => {
    const y = pointer.y;
    // The top zone starts below the sticky header and toolbars, which cover the top of the window.
    const zone = Math.min(100, window.innerHeight * 0.12);
    const top = state.current.top;
    if (y != null) {
      const v = y < top + zone ? -Math.min(1, (top + zone - y) / zone) : y > window.innerHeight - zone ? (y - (window.innerHeight - zone)) / zone : 0;
      if (v) window.scrollBy(0, Math.round(v * 22));
    }
    state.current.raf = requestAnimationFrame(tick);
  }, []);
  const start = useCallback(() => {
    state.current.top = Math.max(
      0,
      ...[...document.querySelectorAll<HTMLElement>("[data-sticky-top]")].filter((el) => getComputedStyle(el).position === "sticky").map((el) => el.getBoundingClientRect().bottom),
    );
    window.addEventListener("pointermove", onMove, { passive: true });
    window.addEventListener("touchmove", onMove, { passive: true });
    state.current.raf = requestAnimationFrame(tick);
  }, [onMove, tick]);
  const stop = useCallback(() => {
    window.removeEventListener("pointermove", onMove);
    window.removeEventListener("touchmove", onMove);
    cancelAnimationFrame(state.current.raf);
    pointer.x = pointer.y = null;
  }, [onMove]);
  useEffect(() => stop, [stop]);
  return { start, stop };
}

/** Wide screens get Ideas and Not doing beside the days; each card exists once, so only one layout is rendered. */
function useWide() {
  const [wide, setWide] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(min-width: 1024px)");
    const on = () => setWide(mq.matches);
    on();
    mq.addEventListener("change", on);
    return () => mq.removeEventListener("change", on);
  }, []);
  return wide;
}

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
  ownerName,
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
  ownerName: string;
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
  const wide = useWide();
  const edge = useEdgeScroll();
  const [drag, setDrag] = useState<DragData | null>(null);
  /** The ideas picker (phones, and "Add an idea" / "Swap" on a day): which day, and what to replace, if anything. */
  const [picker, setPicker] = useState<{ dayId: string | null; replace: DragData | null } | null>(null);
  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 220, tolerance: 8 } }),
    useSensor(KeyboardSensor),
  );

  const dayN = useMemo(() => new Map(days.map((d, i) => [d.id, i + 1])), [days]);
  const dayById = useMemo(() => new Map(days.map((d) => [d.id, d])), [days]);
  const places = useMemo(() => {
    const seen = new Map<string, { id: string; name: string }>();
    for (const d of days) if (d.destinationId && !seen.has(d.destinationId)) seen.set(d.destinationId, { id: d.destinationId, name: d.destinationName ?? "This stop" });
    return [...seen.values()];
  }, [days]);
  const placeName = (id: string | null) => places.find((p) => p.id === id)?.name ?? "that stop";
  const daysAt = (placeId: string | null) => days.filter((d) => d.destinationId === placeId);
  const range = (placeId: string | null) => dayRanges(daysAt(placeId).map((d) => dayN.get(d.id)!));

  const board = boardFor(days, extras, personId, pickOf);
  const boxOf = (dayId: string) => board.days.find((b) => b.day.id === dayId)!;
  const mine = (activityId: string) => pickOf(activityId, personId);
  const isIn = (v: Vote | undefined) => !!v && IN_VOTES.includes(v);
  const loadOf = (dayId: string, extraMin = 0) => boardLoad(boxOf(dayId), personId, extraMin);
  const capacityOf = (d: PickDay) => dayCapacity({ isFirst: d.id === days[0]?.id, isLast: d.id === days.at(-1)?.id }, d.items.map((i) => ({ type: i.type, startTime: i.time, durationMin: i.durationMin })));
  const full = (d: PickDay, minutes: number) => loadOf(d.id, minutes) > capacityOf(d);

  const fansOf = (activityId: string) => members.filter((m) => isIn(pickOf(activityId, m.id)?.vote));
  const goingTo = (i: PickItem) => (i.participants ? members.filter((m) => i.participants!.includes(m.id)) : members).filter((m) => !OUT_VOTES.includes(pickOf(i.activityId!, m.id)?.vote as Vote));
  // People expected but not joined yet: going unless the itinerary already says otherwise.
  const notJoinedGoing = (i: PickItem) => (i.participants ? i.participants.filter(isStandIn).length : Math.max(0, groupSize - members.length));
  const your = personName === "you" ? "your" : `${personName}'s`;

  /* ── Moves (shared by drag and drop and the buttons) ── */
  const keepStar = (activityId: string) => (mine(activityId)?.vote === "must_do" ? "must_do" : "interested");
  /** Says where something went, and warns when the day looks too full. */
  const report = (title: string, day: PickDay, addedMin: number, verb: string) => {
    const load = loadOf(day.id, addedMin);
    const cap = capacityOf(day);
    if (load > cap)
      toast({
        tone: "info",
        title: `${verb} Day ${dayN.get(day.id)}, but it looks full`,
        description: `${cap < 12 * 60 ? `There's only about ${Math.round(cap / 60)}h around the flights that day` : `That's about ${Math.round(load / 60)}h planned`}. Skip something that day, or pick another ${placeName(day.destinationId)} day.`,
      });
    else toast({ tone: "success", title: `${title}: ${verb.toLowerCase()} Day ${dayN.get(day.id)}` });
  };
  const wrongPlace = (d: DragData) => toast({ tone: "info", title: `${d.title} is in ${placeName(d.place)}`, description: `It can go on a ${placeName(d.place)} day (${range(d.place)}).` });

  /** Puts an activity on a day of this person's board. */
  const toDay = (d: DragData, dayId: string, quiet = false) => {
    const day = dayById.get(dayId)!;
    if (d.kind === "joinable") {
      setPick(d.activityId, "interested");
      if (!quiet) toast({ tone: "success", title: `You're in for ${d.title}`, description: `It stays on Day ${dayN.get(d.dayId!)}, with the others.` });
      return;
    }
    if (d.place !== day.destinationId) return wrongPlace(d);
    if (d.dayId === dayId) return;
    if (d.homeDayId) {
      // A base-plan activity: back on its own day, or moved to another day just for this person.
      const back = d.homeDayId === dayId;
      setPick(d.activityId, back ? (mine(d.activityId)?.vote === "must_do" ? "must_do" : null) : keepStar(d.activityId), back ? null : dayId);
      if (!quiet) report(d.title, day, d.durationMin ?? 0, back ? "Back on" : "Moved to");
      return;
    }
    setPick(d.activityId, keepStar(d.activityId), dayId);
    if (!quiet) report(d.title, day, d.durationMin ?? 0, d.dayId ? "Moved to" : "Added to");
  };
  const toOut = (d: DragData, vote: Vote = "not_interested") => {
    if (d.kind === "joinable") return;
    setPick(d.activityId, vote, null);
  };
  const toIdeas = (d: DragData) => {
    if (d.homeDayId) return toast({ tone: "info", title: `${d.title} is in ${ownerName}'s plan`, description: "Drag it to Not doing to skip it, or to another day to move it." });
    setPick(d.activityId, null, null);
  };
  /** Dropped on another card: an idea takes that activity's place; two activities on different days swap days. */
  const swap = (a: DragData, b: DragData) => {
    // Same day (or itself): nothing to swap.
    if (!b.dayId || a.activityId === b.activityId || a.dayId === b.dayId) return;
    const bDay = dayById.get(b.dayId)!;
    if (a.place !== bDay.destinationId) return wrongPlace(a);
    if (b.kind === "joinable") return toDay(a, b.dayId);
    if (!a.dayId) {
      // An idea (or something from Not doing) replaces this activity on that day.
      setPick(b.activityId, "not_interested", null);
      toDay(a, b.dayId, true);
      toast({ tone: "success", title: `Swapped on Day ${dayN.get(b.dayId)}`, description: `${a.title} instead of ${b.title} (now in Not doing).` });
      return;
    }
    const aDay = a.dayId;
    toDay(a, b.dayId, true);
    toDay(b, aDay, true);
    toast({ tone: "success", title: "Swapped days", description: `${a.title} on Day ${dayN.get(b.dayId)}, ${b.title} on Day ${dayN.get(aDay)}.` });
  };

  const onDragStart = (e: DragStartEvent) => {
    setDrag(e.active.data.current as DragData);
    edge.start();
  };
  const onDragEnd = (e: DragEndEvent) => {
    setDrag(null);
    edge.stop();
    const d = e.active.data.current as DragData | undefined;
    const target = e.over?.id ? String(e.over.id) : null;
    if (!d || !target) return;
    if (target.startsWith("card:")) swap(d, e.over!.data.current as DragData);
    else if (target.startsWith("day:")) toDay(d, target.slice(4));
    else if (target === "out" || target === "out-m") {
      if (d.kind !== "out") toOut(d);
    } else if (target === "ideas" && d.kind !== "idea") toIdeas(d);
  };
  const validDay = (dayId: string) => {
    if (!drag) return null;
    if (drag.kind === "joinable") return drag.dayId === dayId;
    return dayById.get(dayId)!.destinationId === drag.place;
  };
  const columnName = (id: string) => (id.startsWith("out") ? "Not doing" : id === "ideas" ? "Ideas" : id.startsWith("card:") ? "an activity" : `Day ${dayN.get(id.slice(4))}`);
  const announcements = {
    onDragStart: ({ active }: { active: { data: { current?: unknown } } }) => `Picked up ${(active.data.current as DragData).title}.`,
    onDragOver: ({ over }: { over: { id: string | number } | null }) => (over ? `Over ${columnName(String(over.id))}.` : "Not over a day."),
    onDragEnd: ({ over, active }: { over: { id: string | number } | null; active: { data: { current?: unknown } } }) => {
      const d = active.data.current as DragData;
      if (!over) return `${d.title} dropped outside the board. Nothing changed.`;
      const id = String(over.id);
      const ok = !id.startsWith("day:") || validDay(id.slice(4)) !== false;
      return ok ? `${d.title} dropped on ${columnName(id)}.` : `${d.title} can't go on ${columnName(id)}. Nothing changed.`;
    },
    onDragCancel: ({ active }: { active: { data: { current?: unknown } } }) => `Cancelled. ${(active.data.current as DragData).title} stays where it was.`,
  };
  const jump = (id: string) => document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });

  const ideaData = (e: PickExtra): DragData => ({ activityId: e.activityId, title: e.title, kind: "idea", dayId: null, homeDayId: null, place: e.destinationId, durationMin: e.durationMin });
  const outCount = board.out.length;

  const outBox = (id: "out" | "out-m") => (
    <OutBox id={id} highlight={drag ? drag.kind !== "out" && drag.kind !== "joinable" : null} count={outCount} editable={editable}>
      {board.out.map((o) => {
        const home = o.homeDayId ? dayById.get(o.homeDayId) : null;
        const data: DragData = { activityId: o.activityId, title: o.title, kind: "out", dayId: null, homeDayId: o.homeDayId, place: o.destinationId };
        return (
          <Card key={o.activityId} data={data} editable={editable} droppable={false} muted title={o.title} slug={o.slug} badge={OUT_LABEL[o.vote]} meta={home ? `Day ${dayN.get(home.id)} · ${formatDay(home.date)}` : placeName(o.destinationId)}>
            {editable && (
              <OutButtons
                vote={o.vote}
                onVote={(nv) => setPick(o.activityId, nv, null)}
                onBack={() => setPick(o.activityId, null, null)}
                backLabel={home ? `Back to Day ${dayN.get(home.id)}` : "Back to ideas"}
              />
            )}
          </Card>
        );
      })}
    </OutBox>
  );

  /** An idea this person added to a day. */
  const extraCard = (e: PlacedExtra, day: PickDay) => {
    const p = mine(e.activityId);
    const others = fansOf(e.activityId).filter((m) => m.id !== personId);
    const data: DragData = { activityId: e.activityId, title: e.title, kind: "extra", dayId: day.id, homeDayId: null, place: e.destinationId, durationMin: e.durationMin };
    return (
      <Card key={e.activityId} data={data} editable={editable} accent time={e.time} durationMin={e.durationMin} title={e.title} slug={e.slug} star={p?.vote === "must_do"}
        badge={personName === "you" ? "Your pick" : `${personName}'s pick`}
        meta={e.time ? <>Not in the group plan yet{others.length ? ` · ${others.length} other${others.length === 1 ? " wants" : "s want"} it` : ""}</> : NO_ROOM} people={fansOf(e.activityId)} peopleLabel="want to do this">
        {editable && (
          <div className="mt-2 flex flex-wrap items-center gap-1.5">
            <StarButton on={p?.vote === "must_do"} title={e.title} onClick={() => setPick(e.activityId, p?.vote === "must_do" ? "interested" : "must_do")} />
            {daysAt(e.destinationId).length > 1 && <DayPicker label={`Move ${e.title} to another day`} verb="Move" days={daysAt(e.destinationId).filter((x) => x.id !== day.id)} dayN={dayN} full={(x) => full(x, e.durationMin)} onPick={(dayId) => toDay(data, dayId)} />}
            <SmallButton onClick={() => setPick(e.activityId, null, null)} icon={Undo2}>Remove</SmallButton>
          </div>
        )}
      </Card>
    );
  };

  return (
    <div className="mt-6">
      {!editable && <p className="mb-3 rounded-md bg-surface-2 px-4 py-2.5 text-sm">{readOnlyNote ?? <>You're looking at <strong>{personName}</strong>'s board. Only they can change it.</>}</p>}
      <div className="mb-4 flex flex-wrap items-center gap-1.5 text-xs" aria-label="Jump to a day">
        <span className="mr-1 text-muted">Jump to day</span>
        {days.map((d) => (
          <button key={d.id} type="button" onClick={() => jump(`col-${d.id}`)} className="inline-flex h-8 min-w-8 items-center justify-center rounded-full border border-line bg-surface px-2 tabular-nums hover:border-ink" title={`${formatDay(d.date)}${d.destinationName ? ` · ${d.destinationName}` : ""}`}>
            {dayN.get(d.id)}
          </button>
        ))}
        {!wide && <button type="button" onClick={() => jump("col-out-m")} className="inline-flex h-8 items-center rounded-full border border-line bg-surface px-3 font-medium hover:border-ink">Not doing ({outCount})</button>}
      </div>

      <DndContext
        id="plan-board"
        sensors={sensors}
        collisionDetection={collision}
        autoScroll={false}
        // Swap targets appear once a drag starts, so drop areas are measured throughout the drag.
        measuring={{ droppable: { strategy: MeasuringStrategy.Always } }}
        onDragStart={onDragStart}
        onDragEnd={onDragEnd}
        onDragCancel={() => {
          setDrag(null);
          edge.stop();
        }}
        accessibility={{ announcements, screenReaderInstructions: { draggable: "To move an activity, press space or enter, use the arrow keys to reach a day, then press space or enter to drop it. Press escape to cancel. Every move is also available from the buttons on the card." } }}
      >
        <div className={cn("grid gap-5", wide && "grid-cols-[17rem_minmax(0,1fr)] xl:grid-cols-[18.5rem_minmax(0,1fr)]")}>
          {/* Ideas and Not doing: beside the days on wide screens, staying in view while you scroll. */}
          {wide && (
          <aside aria-label="Ideas and Not doing">
            <div className="sticky top-[11.75rem] flex max-h-[calc(100dvh-12.75rem)] flex-col gap-3">
              <IdeasPanel
                ideas={board.ideas}
                places={places}
                range={range}
                placeName={placeName}
                editable={editable}
                highlight={drag ? (drag.kind === "extra" || drag.kind === "out") && !drag.homeDayId : null}
                render={(e) => (
                  <Card key={e.activityId} data={ideaData(e)} editable={editable} droppable={false} title={e.title} slug={e.slug}
                    meta={<><strong className="font-semibold text-ink">{placeName(e.destinationId)}</strong> · {formatDuration(e.durationMin)} · {priceText(e)}</>} people={fansOf(e.activityId)} peopleLabel="want to do this">
                    {editable && (
                      <div className="mt-2 flex flex-wrap items-center gap-1.5">
                        <DayPicker label={`Add ${e.title} to a day`} days={daysAt(e.destinationId)} dayN={dayN} full={(x) => full(x, e.durationMin)} onPick={(dayId) => toDay(ideaData(e), dayId)} />
                        <SmallButton onClick={() => setPick(e.activityId, "done_before", null)} icon={History}>Done before</SmallButton>
                      </div>
                    )}
                  </Card>
                )}
              />
              {outBox("out")}
            </div>
          </aside>
          )}

          <div className="min-w-0">
            {editable && !wide && (
              <div className="mb-3">
                <Button variant="outline" className="w-full" onClick={() => setPicker({ dayId: null, replace: null })}>
                  <Lightbulb className="size-4" /> Browse {board.ideas.length} ideas to add
                </Button>
              </div>
            )}
            <div className="grid items-start gap-4 sm:grid-cols-2 xl:grid-cols-3" role="list" aria-label={`${personName === "you" ? "Your" : `${personName}'s`} days`}>
              {board.days.map((b, idx) => (
                <DayBox
                  key={b.day.id}
                  box={b}
                  n={idx + 1}
                  pdf={pdf}
                  ownerName={ownerName}
                  highlight={validDay(b.day.id)}
                  loadMin={loadOf(b.day.id)}
                  capacityMin={capacityOf(b.day)}
                  dragging={drag}
                  placeName={placeName}
                  dayN={dayN}
                  onAddIdea={editable && b.day.destinationId ? () => setPicker({ dayId: b.day.id, replace: null }) : undefined}
                >
                  {inTimeOrder(b).map((x) =>
                    "fixed" in x ? (
                      <FixedRow key={x.fixed.id} item={x.fixed} />
                    ) : "e" in x ? (
                      extraCard(x.e, b.day)
                    ) : (
                    <ActivityCard
                      key={x.a.item.id}
                      a={x.a}
                      day={b.day}
                      editable={editable}
                      your={your}
                      personName={personName}
                      vote={mine(x.a.item.activityId!)?.vote}
                      dayN={dayN}
                      sameDays={daysAt(b.day.destinationId)}
                      full={full}
                      going={goingTo(x.a.item)}
                      notJoined={notJoinedGoing(x.a.item)}
                      total={Math.max(groupSize, members.length)}
                      setPick={setPick}
                      onMove={(data, dayId) => toDay(data, dayId)}
                      onSwap={(data) => setPicker({ dayId: b.day.id, replace: data })}
                    />
                    ),
                  )}
                </DayBox>
              ))}
            </div>
            {!wide && <div className="mt-5">{outBox("out-m")}</div>}
          </div>
        </div>
        <DragOverlay>{drag ? <div className="w-64 rotate-1 rounded-md border border-brand bg-surface px-3 py-2 text-sm font-medium shadow-lg">{drag.title}</div> : null}</DragOverlay>
      </DndContext>
      <p className="mt-3 text-xs text-muted">
        Changes are {your} own and save as you go: drag between days, drop an idea on an activity to swap them, or use the buttons. {ownerName} turns everyone's boards into personal plans.
      </p>

      {picker && (
        <IdeasDialog
          ideas={board.ideas}
          day={picker.dayId ? dayById.get(picker.dayId)! : null}
          replace={picker.replace}
          dayN={dayN}
          places={places}
          placeName={placeName}
          daysAt={daysAt}
          full={full}
          onClose={() => setPicker(null)}
          onPick={(e, dayId) => {
            if (picker.replace) swap(ideaData(e), picker.replace);
            else toDay(ideaData(e), dayId);
            setPicker(null);
          }}
        />
      )}
    </div>
  );
}

const NO_ROOM = "No free time left on this day for it: move it to another day or skip something.";

/** A day's flights, transfers and meals between its activities and added ideas, by time (untimed ones last). */
function inTimeOrder(b: BoardDay) {
  const rows: ({ time: string | null; fixed: PickItem } | { time: string | null; a: PlacedActivity } | { time: string | null; e: PlacedExtra })[] = [
    ...b.fixed.map((fixed) => ({ time: fixed.time, fixed })),
    ...b.activities.map((a) => ({ time: a.time, a })),
    ...b.extras.map((e) => ({ time: e.time, e })),
  ];
  return rows.sort((x, y) => (x.time ?? "99").localeCompare(y.time ?? "99"));
}

function priceText(e: PickExtra) {
  return e.tier === "free" || !e.price || e.price.maxVnd === 0 ? "Free" : <>from <Money vnd={e.price.minVnd} showVnd={false} /></>;
}

/** A base-plan activity (or one added from picks) on a day of this person's board. */
function ActivityCard({
  a,
  day,
  editable,
  your,
  personName,
  vote,
  dayN,
  sameDays,
  full,
  going,
  notJoined,
  total,
  setPick,
  onMove,
  onSwap,
}: {
  a: PlacedActivity;
  day: PickDay;
  editable: boolean;
  your: string;
  personName: string;
  vote: Vote | undefined;
  dayN: Map<string, number>;
  sameDays: PickDay[];
  full: (d: PickDay, minutes: number) => boolean;
  going: BoardMember[];
  notJoined: number;
  total: number;
  setPick: (activityId: string, vote: Vote | null, dayId?: string | null) => void;
  onMove: (d: DragData, dayId: string) => void;
  onSwap: (d: DragData) => void;
}) {
  const i = a.item;
  const id = i.activityId!;
  const data: DragData = { activityId: id, title: i.title, kind: a.joinable ? "joinable" : i.optIn ? "extra" : "base", dayId: day.id, homeDayId: i.optIn ? null : a.homeDayId, place: day.destinationId, durationMin: i.durationMin };
  const badge = a.joinable ? "Others are going" : a.movedFrom ? `Moved from Day ${dayN.get(a.movedFrom)}` : i.optIn ? "Extra pick" : "Base plan";
  const otherDays = sameDays.filter((x) => x.id !== day.id);
  return (
    <Card data={data} editable={editable} muted={a.joinable} accent={!a.joinable && (i.optIn || !!a.movedFrom)} time={a.time} durationMin={i.durationMin} title={i.title} slug={i.slug} star={vote === "must_do"}
      badge={badge} people={going} count={going.length + notJoined} peopleLabel="going" total={total}
      meta={
        a.movedFrom
          ? a.time ? `The group does it on Day ${dayN.get(a.movedFrom)}; ${personName === "you" ? "you" : personName} on this day.` : NO_ROOM
          : a.pickedFor ? `${personName === "you" ? "You" : personName} picked Day ${dayN.get(a.pickedFor)}; the group plan has it on this day, with the others doing it.` : undefined
      }>
      {editable && (
        <div className="mt-2 flex flex-wrap items-center gap-1.5">
          {a.joinable ? (
            <SmallButton onClick={() => setPick(id, "interested")} icon={Plus}>Join</SmallButton>
          ) : (
            <>
              <StarButton compact on={vote === "must_do"} title={i.title} onClick={() => setPick(id, vote === "must_do" ? (a.movedFrom ? "interested" : null) : "must_do")} />
              {a.movedFrom && <SmallButton onClick={() => onMove(data, a.movedFrom!)} icon={Undo2}>Day {dayN.get(a.movedFrom)}</SmallButton>}
              {!i.optIn && otherDays.length > 0 && <DayPicker label={`Move ${i.title} to another day`} verb="Move" days={otherDays} dayN={dayN} full={(x) => full(x, i.durationMin ?? 0)} onPick={(dayId) => onMove(data, dayId)} />}
              <SmallButton onClick={() => onSwap(data)} icon={ArrowLeftRight} label={`Swap ${i.title} for an idea`}>Swap</SmallButton>
              <SmallButton onClick={() => setPick(id, "not_interested", null)} icon={X}>Skip</SmallButton>
              <SmallButton onClick={() => setPick(id, "done_before", null)} icon={History} label="Done before">Done</SmallButton>
            </>
          )}
        </div>
      )}
      <span className="sr-only">{`On ${your} Day ${dayN.get(day.id)}.`}</span>
    </Card>
  );
}

function DayBox({
  box,
  n,
  pdf,
  ownerName,
  highlight,
  loadMin,
  capacityMin,
  dragging,
  placeName,
  dayN,
  onAddIdea,
  children,
}: {
  box: BoardDay;
  n: number;
  pdf: PlanPdf | null;
  ownerName: string;
  highlight: boolean | null;
  loadMin: number;
  capacityMin: number;
  dragging: DragData | null;
  placeName: (id: string | null) => string;
  dayN: Map<string, number>;
  onAddIdea?: () => void;
  children: React.ReactNode;
}) {
  const d = box.day;
  const { setNodeRef, isOver } = useDroppable({ id: `day:${d.id}` });
  const over = loadMin > capacityMin;
  return (
    <section
      ref={setNodeRef}
      data-drop={`day:${d.id}`}
      id={`col-${d.id}`}
      role="listitem"
      aria-label={`Day ${n}`}
      className={cn(
        "flex scroll-mt-48 flex-col rounded-md border bg-surface-2",
        highlight === true && "border-brand ring-2 ring-brand/30",
        highlight === false && "opacity-50",
        highlight === null && "border-line",
        isOver && highlight !== false && "bg-surface",
      )}
    >
      <header className="rounded-t-md bg-brand px-3 py-2.5 text-brand-ink">
        <div className="flex items-baseline justify-between gap-2">
          <p className="text-xs font-semibold tracking-wide uppercase opacity-80">Day {n} · {formatDay(d.date)}</p>
          {pdf && <DayPdfLink pdf={pdf} dayIndex={n - 1} title={`${formatDay(d.date)} in the itinerary`} className="text-brand-ink" />}
        </div>
        <p className="font-serif text-lg leading-tight">{d.title ?? (pdf && !pdf.dayTexts[n - 1] && !box.activities.length ? "Not in the PDF" : "Free day")}</p>
        <p className={cn("text-xs", over ? "font-semibold text-highlight" : "opacity-80")}>
          {[d.destinationName, `${Math.round(loadMin / 60)}h of ${Math.round(capacityMin / 60)}h planned`].filter(Boolean).join(" · ")}
        </p>
      </header>
      <div className="flex flex-col gap-2 p-2">
        {pdf?.dayTexts?.[n - 1] && <PdfDayText text={pdf.dayTexts[n - 1]!} ownerName={ownerName} />}
        {d.notes && <p className="rounded-sm bg-highlight-soft px-2.5 py-2 text-xs">{d.notes}</p>}
        {children}
        {box.activities.length + box.extras.length + box.fixed.length === 0 && <p className="px-1 py-2 text-sm text-muted">{d.destinationId ? `Nothing planned${dragging ? "" : ". Drop an idea here."}` : `Nothing planned, and no place set for this day yet: ideas can go on a day once ${ownerName} sets where you are.`}</p>}
        {dragging && highlight === false && <p className="rounded-sm border border-dashed border-line-strong px-2.5 py-2 text-center text-xs text-muted">{dragging.kind === "joinable" ? `Stays on Day ${dayN.get(dragging.dayId!)}` : `Not in ${placeName(dragging.place)}`}</p>}
        {onAddIdea && (
          <button type="button" onClick={onAddIdea} className="inline-flex h-9 items-center justify-center gap-1 rounded-md border border-dashed border-line-strong text-xs font-medium text-muted hover:border-ink hover:text-ink">
            <Plus className="size-3.5" aria-hidden /> Add an idea for Day {n}
          </button>
        )}
      </div>
    </section>
  );
}

// "3:30–6:00 PM", "9:30 AM–4:30 PM", "7:00 AM–about 6:30 PM", "Morning", "Around 10:00 PM" at the start of an entry.
const PDF_TIME = /^((?:\d{1,2}(?::\d{2})?\s*(?:AM|PM)?\s*[–—-]\s*(?:about\s*)?\d{1,2}(?::\d{2})?\s*(?:AM|PM)?)|\d{1,2}(?::\d{2})?\s*(?:AM|PM)|Morning|Afternoon|Evening|Around \d{1,2}(?::\d{2})?\s*(?:AM|PM)?)\s*/i;

/** What the owner's PDF says for this day: the first lines, with the rest a tap away. */
function PdfDayText({ text, ownerName }: { text: string; ownerName: string }) {
  const [open, setOpen] = useState(false);
  const entries = text.split("\n").filter(Boolean);
  const shown = open ? entries : entries.slice(0, 2);
  return (
    <div className="rounded-sm border border-line bg-surface px-2.5 py-2 text-xs">
      <p className="mb-1 flex items-center gap-1 font-semibold text-muted"><FileText className="size-3.5" aria-hidden />{ownerName}'s PDF</p>
      <ul className="space-y-1">
        {shown.map((e, i) => {
          const m = PDF_TIME.exec(e);
          return (
            <li key={i} className={cn(!open && "line-clamp-2")}>
              {m && <strong className="font-semibold text-brand">{m[1]} </strong>}
              {m ? e.slice(m[0].length) : e}
            </li>
          );
        })}
      </ul>
      {entries.length > 2 || text.length > 160 ? (
        <button type="button" onClick={() => setOpen((o) => !o)} aria-expanded={open} className="mt-1 inline-flex items-center gap-0.5 font-medium text-accent hover:underline">
          {open ? "Show less" : `Read all${entries.length > 2 ? ` ${entries.length}` : ""}`}
          <ChevronDown className={cn("size-3.5", open && "rotate-180")} aria-hidden />
        </button>
      ) : null}
    </div>
  );
}

function IdeasPanel({
  ideas,
  places,
  range,
  placeName,
  editable,
  highlight,
  render,
}: {
  ideas: PickExtra[];
  places: { id: string; name: string }[];
  range: (placeId: string | null) => string;
  placeName: (id: string | null) => string;
  editable: boolean;
  highlight: boolean | null;
  render: (e: PickExtra) => React.ReactNode;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: "ideas" });
  const [place, setPlace] = useState("all");
  const [query, setQuery] = useState("");
  const [shown, setShown] = useState(30);
  const q = query.trim().toLocaleLowerCase();
  const filtered = ideas.filter((e) => (place === "all" || e.destinationId === place) && (!q || e.title.toLocaleLowerCase().includes(q) || placeName(e.destinationId).toLocaleLowerCase().includes(q)));
  return (
    <section
      ref={setNodeRef}
      data-drop="ideas"
      id="col-ideas"
      aria-label="Ideas"
      className={cn("flex min-h-0 flex-1 flex-col rounded-md border bg-surface-2", highlight === true ? "border-brand ring-2 ring-brand/30" : "border-line", isOver && highlight && "bg-surface")}
    >
      <header className="space-y-2 rounded-t-md border-b border-line bg-surface px-3 py-2.5">
        <div>
          <p className="flex items-center gap-1.5 font-semibold"><Lightbulb className="size-4 text-accent" aria-hidden />Ideas</p>
          <p className="text-xs text-muted">{ideas.length} more things to do on the route.{editable ? " Drag one onto a day, or onto an activity to swap." : ""}</p>
        </div>
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
      </header>
      <div className="flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto overscroll-contain p-2">
        {filtered.length === 0 && <p className="px-1 py-3 text-sm text-muted">{q ? "Nothing matches that search." : "Every idea here is already on the board."}</p>}
        {filtered.slice(0, shown).map(render)}
        {filtered.length > shown && (
          <button type="button" onClick={() => setShown((n) => n + 30)} className="w-full rounded-md border border-dashed border-line-strong py-2 text-sm font-medium text-muted hover:text-ink">Show more ({filtered.length - shown})</button>
        )}
      </div>
    </section>
  );
}

/** Picking an idea with taps: to add to a day, or to swap for an activity. */
function IdeasDialog({
  ideas,
  day,
  replace,
  dayN,
  places,
  placeName,
  daysAt,
  full,
  onClose,
  onPick,
}: {
  ideas: PickExtra[];
  day: PickDay | null;
  replace: DragData | null;
  dayN: Map<string, number>;
  places: { id: string; name: string }[];
  placeName: (id: string | null) => string;
  daysAt: (placeId: string | null) => PickDay[];
  full: (d: PickDay, minutes: number) => boolean;
  onClose: () => void;
  onPick: (e: PickExtra, dayId: string) => void;
}) {
  const [place, setPlace] = useState(day?.destinationId ?? "all");
  const [query, setQuery] = useState("");
  const q = query.trim().toLocaleLowerCase();
  const list = ideas.filter((e) => (place === "all" || e.destinationId === place) && (!q || e.title.toLocaleLowerCase().includes(q))).slice(0, 60);
  const title = replace ? `Swap ${replace.title} for…` : day ? `Add an idea to Day ${dayN.get(day.id)}` : "Ideas";
  return (
    <Dialog open onClose={onClose} title={title} description={day ? `${placeName(day.destinationId)} · ${formatDay(day.date)}` : "Add anything to a day at its place."} size="lg">
      <div className="space-y-3">
        <div className="flex flex-col gap-2 sm:flex-row">
          <label className="relative block flex-1">
            <span className="sr-only">Search ideas</span>
            <Search className="pointer-events-none absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-muted" aria-hidden />
            <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search" className="field h-10 pl-8 text-sm" autoFocus />
          </label>
          {!day && (
            <label className="block sm:w-56">
              <span className="sr-only">Place</span>
              <select value={place} onChange={(e) => setPlace(e.target.value)} className="field h-10 text-sm">
                <option value="all">All places</option>
                {places.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </label>
          )}
        </div>
        {list.length === 0 && <p className="py-4 text-sm text-muted">No ideas match.</p>}
        <ul className="divide-y divide-line rounded-md border border-line">
          {list.map((e) => {
            const options = day ? [day] : daysAt(e.destinationId);
            return (
              <li key={e.activityId} className="flex flex-wrap items-center justify-between gap-2 px-3 py-2.5">
                <div className="min-w-0">
                  <p className="font-medium">{e.title}</p>
                  <p className="text-xs text-muted">{placeName(e.destinationId)} · {formatDuration(e.durationMin)} · {priceText(e)}</p>
                </div>
                {options.length === 1 ? (
                  <Button size="sm" variant={replace ? "primary" : "outline"} onClick={() => onPick(e, options[0]!.id)}>
                    {replace ? <><ArrowLeftRight className="size-3.5" /> Do this instead</> : <><Plus className="size-3.5" /> Add to Day {dayN.get(options[0]!.id)}{full(options[0]!, e.durationMin) ? " (full)" : ""}</>}
                  </Button>
                ) : (
                  <DayPicker label={`Add ${e.title} to a day`} days={options} dayN={dayN} full={(x) => full(x, e.durationMin)} onPick={(dayId) => onPick(e, dayId)} />
                )}
              </li>
            );
          })}
        </ul>
      </div>
    </Dialog>
  );
}

function OutBox({ id, highlight, count, editable, children }: { id: "out" | "out-m"; highlight: boolean | null; count: number; editable: boolean; children: React.ReactNode }) {
  const { setNodeRef, isOver } = useDroppable({ id });
  return (
    <section
      ref={setNodeRef}
      data-drop={id}
      id={`col-${id}`}
      aria-label="Not doing"
      className={cn("flex scroll-mt-48 flex-col rounded-md border bg-surface-2", id === "out" && "max-h-[38%] min-h-32", highlight === true ? "border-brand ring-2 ring-brand/30" : "border-line", isOver && highlight && "bg-surface")}
    >
      <header className="rounded-t-md border-b border-line bg-surface px-3 py-2.5">
        <p className="flex items-center gap-1.5 font-semibold"><Ban className="size-4" aria-hidden />Not doing{count ? ` (${count})` : ""}</p>
        <p className="text-xs text-muted">Skipped, can't make it, or already done</p>
      </header>
      <div className="flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto overscroll-contain p-2">
        {count === 0 && <p className="px-1 py-2 text-sm text-muted">{editable ? "Drag anything you'd skip, or have done before, here." : "Nothing skipped."}</p>}
        {children}
      </div>
    </section>
  );
}

function Card({
  data,
  editable,
  droppable = true,
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
  /** Activities on a day take drops, to swap. */
  droppable?: boolean;
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
  const { attributes, listeners, setNodeRef: dragRef, isDragging, active } = useDraggable({ id: `${data.kind}:${data.activityId}`, data, disabled: !editable });
  // While something else from the same place is dragged, the card shows a "Swap" target on its right edge. Dropping
  // there swaps; dropping anywhere else on the day just moves or adds (so a drop on a busy day never swaps by accident).
  const other = active?.data.current as DragData | undefined;
  const canSwap = editable && droppable && !!data.dayId && !!other && other.activityId !== data.activityId && other.dayId !== data.dayId && other.place === data.place && other.kind !== "joinable";
  const { setNodeRef: dropRef, isOver } = useDroppable({ id: `card:${data.activityId}`, data, disabled: !canSwap });
  // With a mouse the whole card drags (people grab the card, not the grip); fields and menus inside it don't start one.
  // Touch and keyboard drags start from the grip, so the page still scrolls when you swipe across a card.
  const { onMouseDown, ...gripListeners } = (listeners ?? {}) as Record<string, (e: React.SyntheticEvent) => void>;
  const swapping = canSwap && isOver;
  return (
    <article
      ref={dragRef}
      onMouseDown={
        editable && onMouseDown
          ? (e) => {
              if ((e.target as Element).closest("select, input, textarea")) return;
              onMouseDown(e);
              // No text selection (after the sensor has seen the press, which it ignores once cancelled): dragging a
              // selection out of the Ideas list made the browser scroll the page to the top.
              e.preventDefault();
            }
          : undefined
      }
      className={cn(
        "relative rounded-md border bg-surface p-2.5 text-sm shadow-xs",
        editable && "md:cursor-grab md:active:cursor-grabbing",
        accent ? "border-accent/50" : "border-line",
        muted && "border-dashed bg-surface/70",
        isDragging && "opacity-40",
        swapping && "ring-2 ring-accent",
      )}
    >
      {canSwap && (
        <span
          ref={dropRef}
          data-drop={`card:${data.activityId}`}
          className={cn(
            "absolute inset-y-1 right-1 z-10 flex w-20 flex-col items-center justify-center gap-0.5 rounded-md border-2 border-dashed text-[11px] font-semibold",
            swapping ? "border-accent bg-accent text-white" : "border-accent/60 bg-surface/90 text-accent",
          )}
        >
          <ArrowLeftRight className="size-4" aria-hidden />
          Swap
        </span>
      )}
      <div className="flex items-start gap-1.5">
        {editable && (
          <button type="button" {...gripListeners} {...attributes} aria-label={`Move ${title}`} className="-my-1 -ml-2 shrink-0 cursor-grab touch-none rounded-sm p-1.5 text-muted hover:text-ink active:cursor-grabbing">
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
            {slug ? <Link href={`/experiences/${slug}`} draggable={false} className="hover:underline">{title}</Link> : title}
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

function SmallButton({ onClick, icon: Icon, label, children }: { onClick: () => void; icon: typeof Check; label?: string; children: React.ReactNode }) {
  return (
    <button type="button" onClick={onClick} aria-label={label} title={label} className="inline-flex h-9 items-center gap-1 rounded-full border border-line px-2.5 text-xs font-medium hover:border-ink sm:h-8">
      <Icon className="size-3.5" aria-hidden />
      {children}
    </button>
  );
}

function StarButton({ on, title, compact, onClick }: { on: boolean; title: string; compact?: boolean; onClick: () => void }) {
  return (
    <button type="button" aria-pressed={on} aria-label={`Must do: ${title}`} title="Must do" onClick={onClick} className={cn("inline-flex h-9 items-center gap-1 rounded-full border text-xs font-medium sm:h-8", compact ? "w-9 justify-center sm:w-8" : "px-2.5", on ? "border-accent bg-accent text-white" : "border-line hover:border-ink")}>
      <Star className={cn("size-3.5", on && "fill-current")} aria-hidden />
      {!compact && "Must do"}
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
    <label className="inline-flex h-9 items-center gap-1 rounded-full border border-line pr-0.5 pl-2.5 text-xs font-medium hover:border-ink sm:h-8">
      {verb === "Move" ? <ArrowLeftRight className="size-3.5 rotate-90" aria-hidden /> : <Plus className="size-3.5" aria-hidden />}
      <select aria-label={label} value="" onChange={(e) => e.target.value && onPick(e.target.value)} className="h-8 max-w-28 bg-transparent pr-0.5 text-xs font-medium focus:outline-none sm:h-7">
        <option value="">{verb === "Move" ? "Move…" : `${verb} to day…`}</option>
        {days.map((d) => <option key={d.id} value={d.id}>Day {dayN.get(d.id)} · {formatDay(d.date)}{full?.(d) ? " (full)" : ""}</option>)}
      </select>
    </label>
  );
}
