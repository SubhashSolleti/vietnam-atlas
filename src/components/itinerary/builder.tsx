"use client";

import {
  closestCorners,
  DndContext,
  DragOverlay,
  KeyboardSensor,
  MouseSensor,
  TouchSensor,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import { SortableContext, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy, arrayMove } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  AlertOctagon,
  BedDouble,
  CalendarDays,
  ChevronRight,
  CloudRain,
  GanttChart,
  GripVertical,
  Info,
  LayoutList,
  Lock,
  MapPin,
  Moon,
  NotebookPen,
  Pencil,
  Plane,
  Plus,
  Route,
  TriangleAlert,
  Utensils,
  Wand2,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState, useTransition } from "react";
import { addItineraryItem, applyRouteTemplate, reorderItems } from "@/app/actions/itinerary";
import { Money } from "@/components/catalog/price";
import { AtlasMap, type MapPin as Pin } from "@/components/map/atlas-map";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useConfirm } from "@/components/ui/confirm";
import { Segmented } from "@/components/ui/segmented";
import { useToast } from "@/components/ui/toast";
import { TRANSPORT_LABELS } from "@/content/taxonomy";
import type { PlanAlert } from "@/lib/planning-alerts";
import { cn, formatDay, formatDuration, fromMinutes, toMinutes, optimizedImage } from "@/lib/utils";
import { AddItemDialog, DayDialog, EditItemDialog, LegDialog, StayDialog } from "./dialogs";
import type { BuilderProps, DayVM, ItemVM, LegVM, SourceVM, StayVM } from "./types";

type View = "days" | "calendar" | "timeline" | "route";

const ICON: Record<string, typeof MapPin> = { activity: MapPin, transport: Plane, accommodation: BedDouble, restaurant: Utensils, note: NotebookPen, free_time: Moon };

export function ItineraryBuilder(props: BuilderProps) {
  const { tripId, days: serverDays, legs, stays, sources, members, destinations, alerts, byDay, templates, canManage } = props;
  const [view, setView] = useState<View>("days");
  const [days, setDays] = useState(serverDays);
  useEffect(() => setDays(serverDays), [serverDays]);
  const [dialog, setDialog] = useState<
    | { kind: "add"; day: DayVM }
    | { kind: "edit"; item: ItemVM; day: DayVM }
    | { kind: "day"; day: DayVM }
    | { kind: "leg"; leg: LegVM | null }
    | { kind: "stay"; stay: StayVM | null }
    | null
  >(null);
  const [activeDrag, setActiveDrag] = useState<string | null>(null);
  const [, start] = useTransition();
  const toast = useToast();
  const confirm = useConfirm();
  const destById = useMemo(() => new Map(destinations.map((d) => [d.id, d])), [destinations]);
  const alertsByDay = useMemo(() => {
    const m = new Map<string, PlanAlert[]>();
    for (const a of alerts) if (a.date) m.set(a.date, [...(m.get(a.date) ?? []), a]);
    return m;
  }, [alerts]);
  const alertItemIds = useMemo(() => new Map(alerts.flatMap((a) => a.itemIds.map((id) => [id, a] as const))), [alerts]);

  // Mouse drags after a small move; touch needs a short press so a swipe still scrolls the page.
  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 220, tolerance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );
  // Screen-reader announcements use plan titles and dates, never internal ids.
  const nameOf = (id: string | number | undefined) => {
    const s = String(id ?? "");
    if (s.startsWith("src:")) return sources.find((x) => `src:${x.activityId}` === s)?.title ?? "experience";
    if (s.startsWith("day:")) {
      const d = days.find((x) => x.id === s.slice(4));
      return d ? formatDay(d.date) : "a day";
    }
    for (const d of days) {
      const it = d.items.find((i) => i.id === s);
      if (it) return `${it.title} (${formatDay(d.date)})`;
    }
    return "item";
  };
  const announcements = {
    onDragStart: ({ active }: { active: { id: string | number } }) => `Picked up ${nameOf(active.id)}.`,
    onDragOver: ({ active, over }: { active: { id: string | number }; over: { id: string | number } | null }) =>
      over ? `${nameOf(active.id)} is over ${nameOf(over.id)}.` : `${nameOf(active.id)} is no longer over a drop target.`,
    onDragEnd: ({ active, over }: { active: { id: string | number }; over: { id: string | number } | null }) =>
      over ? `${nameOf(active.id)} was dropped on ${nameOf(over.id)}.` : `${nameOf(active.id)} was dropped.`,
    onDragCancel: ({ active }: { active: { id: string | number } }) => `Moving ${nameOf(active.id)} was cancelled.`,
  };

  const findDay = (id: string) => days.find((d) => d.id === id || d.items.some((i) => i.id === id));

  const onDragEnd = (e: DragEndEvent) => {
    setActiveDrag(null);
    const { active, over } = e;
    if (!over) return;
    const activeId = String(active.id);
    const overId = String(over.id);
    const targetDay = findDay(overId.replace(/^day:/, ""));
    if (!targetDay) return;
    // Dropping a shortlist/wishlist source onto a day → create an item.
    if (activeId.startsWith("src:")) {
      const src = sources.find((s) => `src:${s.activityId}` === activeId);
      if (!src) return;
      start(async () => {
        const r = await addItineraryItem(targetDay.id, { type: "activity", activityId: src.activityId, title: src.title });
        toast(r.ok ? { tone: "success", title: `Added “${src.title}” to ${formatDay(targetDay.date)}` } : { tone: "error", title: r.error });
      });
      return;
    }
    const fromDay = findDay(activeId);
    if (!fromDay) return;
    const item = fromDay.items.find((i) => i.id === activeId)!;
    if (item.isFixed && fromDay.id !== targetDay.id) {
      toast({ tone: "error", title: "Booked flights can't move to another day." });
      return;
    }
    let next: DayVM[];
    if (fromDay.id === targetDay.id) {
      const oldIdx = fromDay.items.findIndex((i) => i.id === activeId);
      const newIdx = overId.startsWith("day:") ? fromDay.items.length - 1 : fromDay.items.findIndex((i) => i.id === overId);
      if (oldIdx === newIdx) return;
      next = days.map((d) => (d.id === fromDay.id ? { ...d, items: arrayMove(d.items, oldIdx, newIdx) } : d));
    } else {
      const idx = overId.startsWith("day:") ? targetDay.items.length : Math.max(0, targetDay.items.findIndex((i) => i.id === overId));
      next = days.map((d) =>
        d.id === fromDay.id
          ? { ...d, items: d.items.filter((i) => i.id !== activeId) }
          : d.id === targetDay.id
            ? { ...d, items: [...d.items.slice(0, idx), item, ...d.items.slice(idx)] }
            : d,
      );
    }
    setDays(next);
    const moves = [...new Set([fromDay.id, targetDay.id])].map((id) => ({ dayId: id, itemIds: next.find((d) => d.id === id)!.items.map((i) => i.id) }));
    start(async () => {
      const r = await reorderItems(moves);
      if (!r.ok) {
        toast({ tone: "error", title: r.error });
        setDays(serverDays);
      }
    });
  };

  const onDragStart = (e: DragStartEvent) => setActiveDrag(String(e.active.id));
  const dragItem = activeDrag ? (activeDrag.startsWith("src:") ? null : days.flatMap((d) => d.items).find((i) => i.id === activeDrag)) : null;
  const dragSource = activeDrag?.startsWith("src:") ? sources.find((s) => `src:${s.activityId}` === activeDrag) : null;

  const critical = alerts.filter((a) => a.severity === "critical").length;
  const warnings = alerts.filter((a) => a.severity === "warning").length;
  const emptyDays = days.filter((d) => !d.destinationId).length;

  return (
    <div className="container-x mt-6">
      <div className="flex flex-col gap-3 border-b border-line pb-4 md:flex-row md:items-center md:justify-between">
        <Segmented
          label="Itinerary view"
          value={view}
          onChange={setView}
          options={[
            { value: "days", label: "Days", icon: <LayoutList className="size-4" /> },
            { value: "calendar", label: "Calendar", icon: <CalendarDays className="size-4" /> },
            { value: "timeline", label: "Timeline", icon: <GanttChart className="size-4" /> },
            { value: "route", label: "Route", icon: <Route className="size-4" /> },
          ]}
        />
        <div className="flex flex-wrap gap-2">
          <Button size="sm" variant="outline" onClick={() => setDialog({ kind: "leg", leg: null })}><Plane className="size-4" />Transport</Button>
          <Button size="sm" variant="outline" onClick={() => setDialog({ kind: "stay", stay: null })}><BedDouble className="size-4" />Accommodation</Button>
          {canManage && templates.length > 0 && emptyDays > 0 && (
            <Button
              size="sm"
              variant="secondary"
              onClick={async () => {
                const tpl = templates[0]!;
                if (!(await confirm({ title: `Apply “${tpl.name}”?`, description: `${tpl.description} Only empty days are filled and transport is added as “idea” estimates, nothing you've planned is overwritten.`, confirmLabel: "Apply suggestion" }))) return;
                start(async () => {
                  const r = await applyRouteTemplate(tripId, tpl.slug);
                  toast(r.ok ? { tone: "success", title: `Filled ${r.daysFilled} days, added ${r.legsAdded} transfers` } : { tone: "error", title: r.error });
                });
              }}
            >
              <Wand2 className="size-4" />Suggest a route
            </Button>
          )}
        </div>
      </div>

      <div className="mt-6 grid gap-8 lg:grid-cols-[1fr_320px]">
        <div className="min-w-0">
          {view === "days" && (
            <DndContext id="itinerary-dnd" accessibility={{ announcements, screenReaderInstructions: { draggable: "To move a plan, press space or enter, use the arrow keys to move it, then press space or enter again to drop it. Press escape to cancel." } }} sensors={sensors} collisionDetection={closestCorners} onDragStart={onDragStart} onDragEnd={onDragEnd} onDragCancel={() => setActiveDrag(null)}>
              <div className="grid gap-5 xl:grid-cols-[1fr_260px]">
                <ol className="space-y-5">
                  {days.map((d, i) => (
                    <DayCard
                      key={d.id}
                      index={i + 1}
                      day={d}
                      destinationName={d.destinationId ? destById.get(d.destinationId)?.name ?? null : null}
                      dayCostVnd={byDay[d.date] ?? 0}
                      alerts={alertsByDay.get(d.date) ?? []}
                      alertItemIds={alertItemIds}
                      onAdd={() => setDialog({ kind: "add", day: d })}
                      onEditDay={() => setDialog({ kind: "day", day: d })}
                      onEditItem={(item) => setDialog({ kind: "edit", item, day: d })}
                    />
                  ))}
                </ol>
                <SourcePanel sources={sources} />
              </div>
              <DragOverlay>
                {dragItem ? <ItemRow item={dragItem} overlay /> : dragSource ? <SourceChip s={dragSource} overlay /> : null}
              </DragOverlay>
            </DndContext>
          )}
          {view === "calendar" && <CalendarView days={days} destById={destById} onPick={(d) => setDialog({ kind: "day", day: d })} alertsByDay={alertsByDay} />}
          {view === "timeline" && <TimelineView days={days} destById={destById} onEdit={(item, day) => setDialog({ kind: "edit", item, day })} />}
          {view === "route" && <RouteView days={days} legs={legs} stays={stays} destById={destById} onLeg={(leg) => setDialog({ kind: "leg", leg })} onStay={(stay) => setDialog({ kind: "stay", stay })} />}
        </div>

        <aside className="space-y-4" aria-label="Planning alerts">
          <div className="rounded-md border border-line bg-surface p-4 lg:sticky lg:top-24">
            <h2 className="flex items-center gap-2 font-sans text-base font-semibold">
              Planning alerts
              {critical > 0 && <Badge tone="bad">{critical} critical</Badge>}
              {warnings > 0 && <Badge tone="warn">{warnings}</Badge>}
            </h2>
            <p className="mt-1 text-xs text-muted">Recommendations only: nothing is changed automatically.</p>
            {alerts.length ? (
              <ul className="mt-3 max-h-[60vh] space-y-2 overflow-y-auto pr-1">
                {alerts.map((a) => (
                  <li key={a.id} className={cn("rounded-sm border-l-[3px] bg-surface-2 px-3 py-2 text-sm", a.severity === "critical" ? "border-bad" : a.severity === "warning" ? "border-highlight" : "border-line-strong")}>
                    <p className="flex items-start gap-1.5 font-medium">
                      {a.severity === "critical" ? <AlertOctagon className="mt-0.5 size-3.5 shrink-0 text-bad" /> : a.kind === "weather" ? <CloudRain className="mt-0.5 size-3.5 shrink-0 text-muted" /> : a.severity === "warning" ? <TriangleAlert className="mt-0.5 size-3.5 shrink-0 text-warn" /> : <Info className="mt-0.5 size-3.5 shrink-0 text-muted" />}
                      {a.title}
                    </p>
                    {a.date && <p className="text-xs text-muted">{formatDay(a.date)}</p>}
                    <p className="mt-1 text-xs">{a.message}</p>
                    <p className="mt-1 text-xs text-muted"><strong className="text-ink">Suggestion:</strong> {a.recommendation}</p>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-3 text-sm text-good">No conflicts detected.</p>
            )}
          </div>
        </aside>
      </div>

      {dialog?.kind === "add" && <AddItemDialog day={dialog.day} sources={sources} members={members} onClose={() => setDialog(null)} />}
      {dialog?.kind === "edit" && <EditItemDialog item={dialog.item} day={dialog.day} days={days} members={members} onClose={() => setDialog(null)} />}
      {dialog?.kind === "day" && <DayDialog day={dialog.day} destinations={destinations} onClose={() => setDialog(null)} />}
      {dialog?.kind === "leg" && <LegDialog tripId={tripId} leg={dialog.leg} destinations={destinations} members={members} onClose={() => setDialog(null)} />}
      {dialog?.kind === "stay" && (
        <StayDialog tripId={tripId} stay={dialog.stay} destinations={destinations} members={members} defaultDates={[days[0]?.date ?? "", days[1]?.date ?? days[0]?.date ?? ""]} onClose={() => setDialog(null)} />
      )}
    </div>
  );
}

/* ───────── Days view ───────── */

function DayCard({
  day,
  index,
  destinationName,
  dayCostVnd,
  alerts,
  alertItemIds,
  onAdd,
  onEditDay,
  onEditItem,
}: {
  day: DayVM;
  index: number;
  destinationName: string | null;
  dayCostVnd: number;
  alerts: PlanAlert[];
  alertItemIds: Map<string, PlanAlert>;
  onAdd: () => void;
  onEditDay: () => void;
  onEditItem: (i: ItemVM) => void;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: `day:${day.id}` });
  const totalMin = day.items.reduce((s, i) => s + (i.type === "note" ? 0 : i.durationMin ?? 0), 0);
  return (
    <li id={`day-${day.date}`} className={cn("scroll-mt-28 rounded-md border bg-surface transition-colors", isOver ? "border-accent bg-accent-soft/30" : "border-line", day.outOfRange && "opacity-70")}>
      <header className="flex flex-wrap items-center gap-x-3 gap-y-1 border-b border-line px-4 py-3">
        <span className="grid size-9 place-items-center rounded-full bg-brand text-sm font-semibold text-brand-ink tabular-nums">{index}</span>
        <div className="min-w-0 flex-1">
          <p className="text-xs font-semibold tracking-wide text-muted uppercase">{formatDay(day.date)}{day.outOfRange && " · outside trip dates"}</p>
          <button type="button" onClick={onEditDay} className="group flex flex-wrap items-baseline gap-x-1.5 text-left font-semibold hover:text-accent">
            <span className="whitespace-nowrap">{destinationName ?? <span className="text-muted">Choose where you'll be</span>}</span>
            {day.title && <span className="font-normal text-muted">{day.title}</span>}
            <Pencil className="size-3.5 opacity-0 group-hover:opacity-60" />
          </button>
        </div>
        <div className="flex items-center gap-3 text-xs text-muted">
          {totalMin > 0 && <span>{formatDuration(totalMin)} planned</span>}
          {dayCostVnd > 0 && <Money vnd={dayCostVnd} showVnd={false} className="font-medium text-ink" />}
          {alerts.some((a) => a.severity !== "info") && <TriangleAlert className="size-4 text-warn" aria-label="This day has warnings" />}
        </div>
      </header>
      {day.notes && <p className="border-b border-line bg-surface-2 px-4 py-2 text-sm text-muted">{day.notes}</p>}
      <div ref={setNodeRef} className="min-h-14 p-2">
        <SortableContext items={day.items.map((i) => i.id)} strategy={verticalListSortingStrategy}>
          <ul className="space-y-1.5">
            {day.items.map((item) => (
              <SortableItem key={item.id} item={item} alert={alertItemIds.get(item.id)} onEdit={() => onEditItem(item)} />
            ))}
          </ul>
        </SortableContext>
        {!day.items.length && <p className="px-2 py-3 text-sm text-muted">Nothing planned yet: add something or drag an activity here.</p>}
        <button type="button" onClick={onAdd} className="mt-1.5 flex w-full items-center justify-center gap-1.5 rounded-sm border border-dashed border-line-strong py-2 text-sm text-muted hover:border-ink hover:text-ink">
          <Plus className="size-4" /> Add to this day
        </button>
      </div>
    </li>
  );
}

function SortableItem({ item, alert, onEdit }: { item: ItemVM; alert?: PlanAlert; onEdit: () => void }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: item.id });
  return (
    <li ref={setNodeRef} style={{ transform: CSS.Transform.toString(transform), transition }} className={cn(isDragging && "opacity-40")}>
      <ItemRow item={item} alert={alert} onEdit={onEdit} handle={{ ...attributes, ...listeners }} />
    </li>
  );
}

function ItemRow({ item, alert, onEdit, handle, overlay }: { item: ItemVM; alert?: PlanAlert; onEdit?: () => void; handle?: Record<string, unknown>; overlay?: boolean }) {
  const Icon = ICON[item.type] ?? MapPin;
  const end = item.startTime && item.durationMin ? fromMinutes((toMinutes(item.startTime) ?? 0) + item.durationMin) : null;
  return (
    <div className={cn("flex items-center gap-2 rounded-sm border bg-surface px-2 py-2", overlay ? "border-accent shadow-[var(--shadow-pop)]" : "border-line", alert?.severity === "critical" && "border-bad/60 bg-bad-soft/40")}>
      <button type="button" {...handle} aria-label={`Drag to reorder ${item.title}`} className="grid size-7 shrink-0 cursor-grab touch-none place-items-center rounded-sm text-muted hover:bg-surface-2 active:cursor-grabbing">
        {item.isFixed ? <Lock className="size-3.5" /> : <GripVertical className="size-4" />}
      </button>
      <span className="w-14 shrink-0 text-xs text-muted tabular-nums">{item.startTime ?? "-"}{end && <span className="block">{end}</span>}</span>
      {item.image ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={optimizedImage(item.image, 96)} alt="" className="size-9 shrink-0 rounded-sm object-cover" loading="lazy" />
      ) : (
        <span className="grid size-9 shrink-0 place-items-center rounded-sm bg-surface-2 text-muted"><Icon className="size-4" /></span>
      )}
      <button type="button" onClick={onEdit} className="min-w-0 flex-1 text-left">
        <span className="block truncate text-sm font-medium">{item.title}</span>
        <span className="flex flex-wrap items-center gap-x-2 text-xs text-muted">
          {item.durationMin ? formatDuration(item.durationMin) : null}
          {item.participants && <span>{item.participants.length} going</span>}
          {item.weatherDependent && <span className="inline-flex items-center gap-0.5"><CloudRain className="size-3" />weather</span>}
          {alert && alert.severity !== "info" && <span className={alert.severity === "critical" ? "text-bad" : "text-warn"}>{alert.title}</span>}
        </span>
      </button>
      {item.costVnd > 0 && <Money vnd={item.costVnd} showVnd={false} className="shrink-0 text-xs" />}
      {item.activitySlug && (
        <Link href={`/experiences/${item.activitySlug}`} aria-label={`Open ${item.title}`} className="shrink-0 text-muted hover:text-ink"><ChevronRight className="size-4" /></Link>
      )}
    </div>
  );
}

function SourcePanel({ sources }: { sources: SourceVM[] }) {
  return (
    <aside className="xl:sticky xl:top-24 xl:self-start" aria-label="Activities to schedule">
      <div className="rounded-md border border-line bg-surface p-3">
        <h2 className="px-1 font-sans text-sm font-semibold">Drag onto a day</h2>
        <p className="px-1 text-xs text-muted">Approved, shortlisted and wishlist activities.</p>
        {sources.length ? (
          <ul className="mt-2 max-h-[60vh] space-y-1.5 overflow-y-auto">
            {sources.map((s) => (
              <DraggableSource key={s.activityId} s={s} />
            ))}
          </ul>
        ) : (
          <p className="mt-3 px-1 text-sm text-muted">Save experiences or add them to the group shortlist to see them here. <Link href="/experiences" className="text-accent underline">Browse</Link></p>
        )}
      </div>
    </aside>
  );
}

function DraggableSource({ s }: { s: SourceVM }) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({ id: `src:${s.activityId}` });
  return (
    <li ref={setNodeRef} {...attributes} {...listeners} className={cn("cursor-grab touch-manipulation", isDragging && "opacity-40")}>
      <SourceChip s={s} />
    </li>
  );
}

function SourceChip({ s, overlay }: { s: SourceVM; overlay?: boolean }) {
  return (
    <div className={cn("flex items-center gap-2 rounded-sm border bg-surface px-2 py-1.5", overlay ? "border-accent shadow-[var(--shadow-pop)]" : "border-line", s.scheduled && !overlay && "opacity-60")}>
      <GripVertical className="size-3.5 shrink-0 text-muted" />
      <span className="min-w-0 flex-1">
        <span className="block truncate text-xs font-medium">{s.title}</span>
        <span className="block truncate text-[0.68rem] text-muted">{s.destinationName} · {s.scheduled ? "scheduled" : s.origin}</span>
      </span>
    </div>
  );
}

/* ───────── Calendar view ───────── */

function CalendarView({ days, destById, onPick, alertsByDay }: { days: DayVM[]; destById: Map<string, { name: string }>; onPick: (d: DayVM) => void; alertsByDay: Map<string, PlanAlert[]> }) {
  if (!days.length) return null;
  const first = new Date(`${days[0]!.date}T00:00:00Z`);
  const offset = (first.getUTCDay() + 6) % 7; // Monday-first
  // Lay out every calendar date from the first to the last day so a gap never shifts the weekdays.
  const byDate = new Map(days.map((d) => [d.date, d]));
  const span: (DayVM | null)[] = [];
  for (let d = new Date(first); d.toISOString().slice(0, 10) <= days.at(-1)!.date; d.setUTCDate(d.getUTCDate() + 1)) span.push(byDate.get(d.toISOString().slice(0, 10)) ?? null);
  const cells: (DayVM | null)[] = [...Array(offset).fill(null), ...span];
  while (cells.length % 7) cells.push(null);
  return (
    <div>
      <div className="grid grid-cols-7 gap-px overflow-hidden rounded-md border border-line bg-line text-sm">
        {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((d) => (
          <div key={d} className="bg-surface-2 px-2 py-1.5 text-center text-xs font-semibold text-muted">{d}</div>
        ))}
        {cells.map((d, i) =>
          d ? (
            <button key={d.id} type="button" onClick={() => onPick(d)} className="flex min-h-28 flex-col bg-surface p-2 text-left hover:bg-surface-2">
              <span className="flex items-center justify-between text-xs font-semibold">
                {Number(d.date.slice(8))} {i === offset || d.date.endsWith("-01") ? new Date(`${d.date}T00:00:00Z`).toLocaleString("en-GB", { month: "short", timeZone: "UTC" }) : ""}
                {alertsByDay.get(d.date)?.some((a) => a.severity === "critical") && <AlertOctagon className="size-3.5 text-bad" />}
              </span>
              <span className="mt-1 truncate text-xs font-medium text-brand-2">{d.destinationId ? destById.get(d.destinationId)?.name : "-"}</span>
              <ul className="mt-1 space-y-0.5">
                {d.items.slice(0, 3).map((it) => <li key={it.id} className="truncate text-[0.7rem] text-muted">{it.startTime ? `${it.startTime} ` : ""}{it.title}</li>)}
                {d.items.length > 3 && <li className="text-[0.7rem] text-muted">+{d.items.length - 3} more</li>}
              </ul>
            </button>
          ) : (
            <div key={`x${i}`} className="min-h-28 bg-surface-2/50" />
          ),
        )}
      </div>
      <p className="mt-2 text-xs text-muted">Select a day to set its destination and notes. Switch to Days to add and reorder plans.</p>
    </div>
  );
}

/* ───────── Timeline view ───────── */

const T_START = 6 * 60,
  T_END = 24 * 60;

function TimelineView({ days, destById, onEdit }: { days: DayVM[]; destById: Map<string, { name: string }>; onEdit: (i: ItemVM, d: DayVM) => void }) {
  const pct = (m: number) => `${((Math.min(Math.max(m, T_START), T_END) - T_START) / (T_END - T_START)) * 100}%`;
  return (
    <div className="relative overflow-x-auto">
      <div className="min-w-[720px]">
        <div className="ml-36 flex justify-between border-b border-line pb-1 text-[0.68rem] text-muted">
          {[6, 9, 12, 15, 18, 21, 24].map((h) => <span key={h}>{String(h % 24).padStart(2, "0")}:00</span>)}
        </div>
        <ul>
          {days.map((d) => {
            const timed = d.items.filter((i) => i.startTime);
            const untimed = d.items.filter((i) => !i.startTime);
            return (
              <li key={d.id} className="flex border-b border-line py-2">
                <div className="w-36 shrink-0 pr-3">
                  <p className="text-xs font-semibold">{formatDay(d.date)}</p>
                  <p className="truncate text-xs text-muted">{d.destinationId ? destById.get(d.destinationId)?.name : "-"}</p>
                </div>
                <div className="relative flex-1">
                  <div className="relative h-9 rounded-sm bg-surface-2">
                    {timed.map((it) => {
                      const s = toMinutes(it.startTime)!;
                      const e = s + (it.durationMin ?? 60);
                      return (
                        <button key={it.id} type="button" onClick={() => onEdit(it, d)} title={`${it.startTime} ${it.title}`}
                          className={cn("absolute top-1 bottom-1 truncate rounded-[3px] px-1.5 text-left text-[0.68rem] font-medium text-white", it.type === "transport" ? "bg-terracotta" : it.type === "restaurant" ? "bg-ochre text-charcoal" : "bg-jade")}
                          style={{ left: pct(s), width: `calc(${pct(e)} - ${pct(s)})` }}>
                          {it.title}
                        </button>
                      );
                    })}
                  </div>
                  {untimed.length > 0 && <p className="mt-1 truncate text-[0.68rem] text-muted">No time set: {untimed.map((u) => u.title).join(" · ")}</p>}
                </div>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}

/* ───────── Route view ───────── */

function RouteView({ days, legs, stays, destById, onLeg, onStay }: { days: DayVM[]; legs: LegVM[]; stays: StayVM[]; destById: Map<string, { id: string; name: string; lat: number; lng: number; slug: string }>; onLeg: (l: LegVM) => void; onStay: (s: StayVM) => void }) {
  const stops = useMemo(() => {
    const out: { id: string; name: string; lat: number; lng: number; slug: string; from: string; to: string }[] = [];
    for (const d of days) {
      if (!d.destinationId) continue;
      const dest = destById.get(d.destinationId);
      if (!dest) continue;
      const last = out.at(-1);
      if (last?.id === dest.id) last.to = d.date;
      else out.push({ ...dest, from: d.date, to: d.date });
    }
    return out;
  }, [days, destById]);
  const pins: Pin[] = stops.map((s, i) => ({ id: `${s.id}-${i}`, lat: s.lat, lng: s.lng, kind: "stop", label: String(i + 1), title: s.name, subtitle: s.from === s.to ? formatDay(s.from) : `${formatDay(s.from)} – ${formatDay(s.to)}`, href: `/destinations/${s.slug}` }));
  const routes = stops.length > 1 ? [{ id: "route", points: stops.map((s) => [s.lat, s.lng] as [number, number]) }] : [];
  return (
    <div className="space-y-6">
      <div className="h-[420px] overflow-hidden rounded-md border border-line">
        {stops.length ? <AtlasMap pins={pins} routes={routes} cluster={false} embedded ariaLabel="Trip route map" /> : <div className="grid h-full place-items-center text-sm text-muted">Set a destination for each day to see the route.</div>}
      </div>
      <section aria-labelledby="legs-h">
        <h2 id="legs-h" className="mb-3 text-2xl">Transport between destinations</h2>
        {legs.length ? (
          <ul className="space-y-2">
            {legs.map((l) => (
              <li key={l.id} className="rounded-md border border-line bg-surface p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="flex flex-wrap items-center gap-2 font-semibold">
                      {l.fromName} → {l.toName}
                      <Badge>{TRANSPORT_LABELS[l.mode] ?? l.mode}</Badge>
                      {l.overnight && <Badge tone="accent" icon={<Moon className="size-3" />}>Overnight</Badge>}
                      {l.isFixed && <Badge tone="brand" icon={<Lock className="size-3" />}>Booked flight</Badge>}
                      <Badge tone={l.status === "booked" ? "good" : l.status === "quoted" ? "neutral" : "warn"}>{l.status === "idea" ? "Estimate" : l.status === "quoted" ? "Quoted" : "Booked"}</Badge>
                    </p>
                    <dl className="mt-2 grid grid-cols-2 gap-x-6 gap-y-1 text-sm sm:grid-cols-4">
                      <div><dt className="text-xs text-muted">Departs</dt><dd>{l.departAt ? `${formatDay(l.departAt.slice(0, 10))} ${l.departAt.slice(11)}` : "-"}</dd></div>
                      <div><dt className="text-xs text-muted">Arrives</dt><dd>{l.arriveAt ? `${formatDay(l.arriveAt.slice(0, 10))} ${l.arriveAt.slice(11)}` : "-"}</dd></div>
                      <div><dt className="text-xs text-muted">Duration</dt><dd>{l.durationMin ? formatDuration(l.durationMin): "-"}</dd></div>
                      <div><dt className="text-xs text-muted">Cost</dt><dd>{l.isInternational ? "Excluded (pre-booked)" : l.costVnd ? <><Money vnd={l.costVnd} showVnd={false} /> {l.costMode === "total" ? "total" : "pp"}</> : "-"}</dd></div>
                    </dl>
                    {l.luggageNote && <p className="mt-2 text-xs text-muted"><strong className="text-ink">Luggage:</strong> {l.luggageNote}</p>}
                    {l.notes && <p className="mt-1 text-xs text-muted">{l.notes}</p>}
                  </div>
                  <Button size="sm" variant="ghost" onClick={() => onLeg(l)}><Pencil className="size-4" />Edit</Button>
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-muted">No transport added yet.</p>
        )}
        <p className="mt-2 text-xs text-muted">Times and fares added from suggestions are planning estimates, not live schedules. Check Vietnam Railways, airline and bus operator sites before booking.</p>
      </section>
      <section aria-labelledby="stays-h">
        <h2 id="stays-h" className="mb-3 text-2xl">Accommodation</h2>
        {stays.length ? (
          <ul className="space-y-2">
            {stays.map((s) => (
              <li key={s.id} className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-line bg-surface p-4">
                <div>
                  <p className="font-semibold">{s.name} <span className="font-normal text-muted capitalize">· {s.type}</span></p>
                  <p className="text-sm text-muted">{formatDay(s.checkIn)} → {formatDay(s.checkOut)} · {s.costVnd ? <><Money vnd={s.costVnd} showVnd={false} /> {s.costMode === "total" ? "total" : "pp"}</> : "no cost yet"} · {s.status}</p>
                </div>
                <Button size="sm" variant="ghost" onClick={() => onStay(s)}><Pencil className="size-4" />Edit</Button>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-muted">No stays added. Until you add them, the budget uses an illustrative per-night estimate.</p>
        )}
      </section>
    </div>
  );
}
