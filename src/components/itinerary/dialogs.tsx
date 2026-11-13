"use client";

import { useState, useTransition } from "react";
import { addItineraryItem, deleteItineraryItem, deleteStay, deleteTransportLeg, reorderItems, saveStay, saveTransportLeg, updateDay, updateItineraryItem } from "@/app/actions/itinerary";
import { useFx } from "@/components/site/fx";
import { Button } from "@/components/ui/button";
import { useConfirm } from "@/components/ui/confirm";
import { Dialog } from "@/components/ui/dialog";
import { Field, Input, Select, Textarea } from "@/components/ui/form";
import { useToast } from "@/components/ui/toast";
import { TRANSPORT_LABELS } from "@/content/taxonomy";
import { formatInr, formatVnd, vndToInr } from "@/lib/money";
import { formatDay } from "@/lib/utils";
import type { DayVM, DestVM, ItemVM, LegVM, MemberVM, SourceVM, StayVM } from "./types";

type R = { ok: boolean; error?: string };
function useRun() {
  const toast = useToast();
  const [pending, start] = useTransition();
  const run = (fn: () => Promise<R>, ok?: string, after?: () => void) =>
    start(async () => {
      const r = await fn();
      if (!r.ok) toast({ tone: "error", title: (r as { error: string }).error });
      else {
        if (ok) toast({ tone: "success", title: ok });
        after?.();
      }
    });
  return { pending, run };
}

/** INR input that stores VND, showing both currencies. */
function MoneyInput({ label, name, vnd, onChange }: { label: string; name: string; vnd: number; onChange: (vnd: number) => void }) {
  const fx = useFx();
  const [inr, setInr] = useState(vnd ? String(Math.round(vndToInr(vnd, fx))) : "");
  return (
    <Field label={label} name={name} hint={inr ? `≈ ${formatVnd(Math.round(Number(inr) * fx.inrToVnd))}` : "Enter in rupees; stored in dong"}>
      {(p) => <Input {...p} type="number" min={0} step={10} value={inr} onChange={(e) => { setInr(e.target.value); onChange(Math.round(Number(e.target.value || 0) * fx.inrToVnd)); }} />}
    </Field>
  );
}

function Participants({ members, value, onChange }: { members: MemberVM[]; value: string[] | null; onChange: (v: string[] | null) => void }) {
  const ids = value ?? members.map((m) => m.id);
  return (
    <fieldset>
      <legend className="mb-1.5 text-sm font-medium">Who's taking part? <span className="font-normal text-muted">({ids.length}/{members.length})</span></legend>
      <div className="grid grid-cols-2 gap-1 sm:grid-cols-3">
        {members.map((m) => (
          <label key={m.id} className="flex items-center gap-2 text-sm">
            <input type="checkbox" className="size-4 accent-[var(--brand)]" checked={ids.includes(m.id)}
              onChange={() => { const next = ids.includes(m.id) ? ids.filter((x) => x !== m.id) : [...ids, m.id]; onChange(next.length === members.length ? null : next.length ? next : ids); }} />
            {m.name}
          </label>
        ))}
      </div>
    </fieldset>
  );
}

/* ───────── Add item ───────── */

export function AddItemDialog({ day, sources, members, onClose }: { day: DayVM; sources: SourceVM[]; members: MemberVM[]; onClose: () => void }) {
  const { pending, run } = useRun();
  const [type, setType] = useState<"activity" | "restaurant" | "note" | "free_time">("activity");
  const [activityId, setActivityId] = useState("");
  const [title, setTitle] = useState("");
  const [startTime, setStartTime] = useState("");
  const [duration, setDuration] = useState(60);
  const [cost, setCost] = useState(0);
  const [costMode, setCostMode] = useState<"per_person" | "total">("per_person");
  const [participants, setParticipants] = useState<string[] | null>(null);
  const [notes, setNotes] = useState("");
  const [q, setQ] = useState("");
  const [hits, setHits] = useState<{ title: string; href: string; subtitle: string }[]>([]);
  const [catalogPick, setCatalogPick] = useState<{ slug: string; title: string } | null>(null);

  const search = async (text: string) => {
    setQ(text);
    if (text.trim().length < 2) return setHits([]);
    const r = await fetch(`/api/search?kinds=activity,food&limit=8&q=${encodeURIComponent(text)}`).then((x) => x.json()).catch(() => ({ hits: [] }));
    setHits(r.hits);
  };

  const submit = () =>
    run(async () => {
      let actId = activityId || undefined;
      if (!actId && catalogPick) {
        const res = await fetch(`/api/activities/${catalogPick.slug}`).then((x) => x.json()).catch(() => null);
        actId = res?.id;
      }
      return addItineraryItem(day.id, {
        type,
        activityId: type === "activity" ? actId ?? null : null,
        title: title || (catalogPick?.title ?? sources.find((s) => s.activityId === activityId)?.title ?? ""),
        startTime: startTime || null,
        durationMin: type === "activity" && actId ? undefined : duration,
        costVnd: type === "activity" && actId && !cost ? undefined : cost,
        costMode: type === "activity" && actId && !cost ? undefined : costMode,
        participants,
        notes: notes || null,
      });
    }, "Added to the day", onClose);

  return (
    <Dialog open onClose={onClose} title={`Add to ${formatDay(day.date)}`} size="md"
      footer={<><Button variant="ghost" onClick={onClose}>Cancel</Button><Button disabled={pending || (type === "activity" ? !activityId && !catalogPick && !title : !title)} onClick={submit}>Add</Button></>}>
      <div className="space-y-4">
        <div role="radiogroup" aria-label="Type" className="grid grid-cols-4 gap-1 rounded-md bg-surface-2 p-1 text-sm">
          {(["activity", "restaurant", "free_time", "note"] as const).map((t) => (
            <button key={t} type="button" role="radio" aria-checked={type === t} onClick={() => setType(t)} className={`h-8 rounded-[6px] ${type === t ? "bg-surface font-semibold shadow-sm" : "text-muted"}`}>
              {{ activity: "Activity", restaurant: "Restaurant", free_time: "Free time", note: "Note" }[t]}
            </button>
          ))}
        </div>
        {type === "activity" && (
          <>
            {sources.length > 0 && (
              <Field label="From your shortlist & wishlist" name="src">
                {(p) => (
                  <Select {...p} value={activityId} onChange={(e) => { setActivityId(e.target.value); setCatalogPick(null); }}>
                    <option value="">Choose,</option>
                    {sources.map((s) => <option key={s.activityId} value={s.activityId}>{s.title} · {s.destinationName} ({s.origin}){s.scheduled ? "already scheduled" : ""}</option>)}
                  </Select>
                )}
              </Field>
            )}
            <div>
              <label htmlFor="cat-search" className="mb-1.5 block text-sm font-medium">…or search the catalogue</label>
              <input id="cat-search" className="field" value={q} onChange={(e) => search(e.target.value)} placeholder="e.g. kayaking, night market" />
              {hits.length > 0 && (
                <ul className="mt-1 max-h-48 overflow-y-auto rounded-sm border border-line">
                  {hits.map((h) => {
                    const slug = h.href.split("/").pop()!;
                    return (
                      <li key={h.href}>
                        <button type="button" onClick={() => { setCatalogPick({ slug, title: h.title }); setActivityId(""); setHits([]); setQ(h.title); }} className="w-full px-3 py-2 text-left text-sm hover:bg-surface-2">
                          {h.title} <span className="text-muted">· {h.subtitle}</span>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}
              {catalogPick && <p className="mt-1 text-xs text-good">Selected: {catalogPick.title}</p>}
            </div>
          </>
        )}
        {type !== "activity" && <Field label={type === "restaurant" ? "Restaurant or meal" : type === "note" ? "Note" : "Title"} name="it-title">{(p) => <Input {...p} value={title} onChange={(e) => setTitle(e.target.value)} maxLength={160} />}</Field>}
        <div className="grid grid-cols-2 gap-3">
          <Field label="Start time" name="it-start" hint="Local time (optional)">{(p) => <Input {...p} type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} />}</Field>
          <Field label="Duration (minutes)" name="it-dur" hint={type === "activity" ? "Defaults to the activity's duration" : undefined}>{(p) => <Input {...p} type="number" min={0} step={15} value={duration} onChange={(e) => setDuration(Number(e.target.value))} />}</Field>
        </div>
        {type !== "note" && (
          <div className="grid grid-cols-2 gap-3">
            <MoneyInput label="Estimated cost (₹)" name="it-cost" vnd={cost} onChange={setCost} />
            <Field label="Cost is" name="it-mode">{(p) => <Select {...p} value={costMode} onChange={(e) => setCostMode(e.target.value as "total")}><option value="per_person">Per person</option><option value="total">Total, split</option></Select>}</Field>
          </div>
        )}
        {type === "activity" && <p className="text-xs text-muted">Leave cost at 0 to use the activity's estimated price (or the group's agreed price).</p>}
        <Participants members={members} value={participants} onChange={setParticipants} />
        <Field label="Notes" name="it-notes">{(p) => <Textarea {...p} rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} />}</Field>
      </div>
    </Dialog>
  );
}

/* ───────── Edit item ───────── */

export function EditItemDialog({ item, day, days, members, onClose }: { item: ItemVM; day: DayVM; days: DayVM[]; members: MemberVM[]; onClose: () => void }) {
  const { pending, run } = useRun();
  const confirm = useConfirm();
  const [v, setV] = useState({ title: item.title, startTime: item.startTime ?? "", durationMin: item.durationMin ?? 60, costVnd: item.costVnd, costMode: item.costMode, participants: item.participants, notes: item.notes ?? "" });
  const [dayId, setDayId] = useState(day.id);
  const save = () =>
    run(async () => {
      const r = await updateItineraryItem(item.id, {
        title: v.title,
        ...(item.isFixed ? {} : { startTime: v.startTime || null, durationMin: v.durationMin }),
        costVnd: v.costVnd,
        costMode: v.costMode,
        participants: v.participants,
        notes: v.notes || null,
      });
      if (!r.ok || dayId === day.id) return r;
      const target = days.find((d) => d.id === dayId)!;
      return reorderItems([
        { dayId: day.id, itemIds: day.items.filter((i) => i.id !== item.id).map((i) => i.id) },
        { dayId, itemIds: [...target.items.map((i) => i.id), item.id] },
      ]);
    }, "Saved", onClose);
  return (
    <Dialog open onClose={onClose} title="Edit plan" description={item.isFixed ? "Booked flight: time is locked. Edit the flight itself in the Route view if the booking changes." : undefined}
      footer={
        <>
          {!item.isFixed && (
            <Button variant="ghost" className="mr-auto text-bad" disabled={pending}
              onClick={async () => (await confirm({ title: "Remove from the itinerary?", description: item.activityId ? "The activity goes back to the shortlist as approved." : undefined, confirmLabel: "Remove", tone: "danger" })) && run(() => deleteItineraryItem(item.id), "Removed", onClose)}>
              Remove
            </Button>
          )}
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button disabled={pending} onClick={save}>Save</Button>
        </>
      }>
      <div className="space-y-4">
        <Field label="Title" name="e-title">{(p) => <Input {...p} value={v.title} onChange={(e) => setV({ ...v, title: e.target.value })} />}</Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Start time" name="e-start">{(p) => <Input {...p} type="time" disabled={item.isFixed} value={v.startTime} onChange={(e) => setV({ ...v, startTime: e.target.value })} />}</Field>
          <Field label="Duration (min)" name="e-dur">{(p) => <Input {...p} type="number" min={0} step={15} disabled={item.isFixed} value={v.durationMin} onChange={(e) => setV({ ...v, durationMin: Number(e.target.value) })} />}</Field>
        </div>
        {!item.transportLegId && (
          <>
            <Field label="Day" name="e-day">{(p) => <Select {...p} value={dayId} onChange={(e) => setDayId(e.target.value)}>{days.map((d) => <option key={d.id} value={d.id}>{formatDay(d.date)}</option>)}</Select>}</Field>
            <div className="grid grid-cols-2 gap-3">
              <MoneyInput label="Cost (₹)" name="e-cost" vnd={v.costVnd} onChange={(c) => setV({ ...v, costVnd: c })} />
              <Field label="Cost is" name="e-mode">{(p) => <Select {...p} value={v.costMode} onChange={(e) => setV({ ...v, costMode: e.target.value as "total" })}><option value="per_person">Per person</option><option value="total">Total, split</option></Select>}</Field>
            </div>
            <Participants members={members} value={v.participants} onChange={(x) => setV({ ...v, participants: x })} />
          </>
        )}
        <Field label="Notes" name="e-notes">{(p) => <Textarea {...p} rows={3} value={v.notes} onChange={(e) => setV({ ...v, notes: e.target.value })} />}</Field>
      </div>
    </Dialog>
  );
}

/* ───────── Day ───────── */

export function DayDialog({ day, destinations, onClose }: { day: DayVM; destinations: DestVM[]; onClose: () => void }) {
  const { pending, run } = useRun();
  const [v, setV] = useState({ destinationId: day.destinationId ?? "", title: day.title ?? "", notes: day.notes ?? "" });
  return (
    <Dialog open onClose={onClose} title={formatDay(day.date)} size="sm"
      footer={<><Button variant="ghost" onClick={onClose}>Cancel</Button><Button disabled={pending} onClick={() => run(() => updateDay(day.id, { destinationId: v.destinationId || null, title: v.title || null, notes: v.notes || null }), "Day updated", onClose)}>Save</Button></>}>
      <div className="space-y-4">
        <Field label="Based in" name="d-dest">{(p) => <Select {...p} value={v.destinationId} onChange={(e) => setV({ ...v, destinationId: e.target.value })}><option value="">Not decided</option>{[...destinations].sort((a, b) => a.name.localeCompare(b.name)).map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}</Select>}</Field>
        <Field label="Day title" name="d-title">{(p) => <Input {...p} value={v.title} onChange={(e) => setV({ ...v, title: e.target.value })} maxLength={120} placeholder="e.g. Islands & snorkelling" />}</Field>
        <Field label="Notes" name="d-notes">{(p) => <Textarea {...p} rows={3} value={v.notes} onChange={(e) => setV({ ...v, notes: e.target.value })} />}</Field>
      </div>
    </Dialog>
  );
}

/* ───────── Transport ───────── */

export function LegDialog({ tripId, leg, destinations, members, onClose }: { tripId: string; leg: LegVM | null; destinations: DestVM[]; members: MemberVM[]; onClose: () => void }) {
  const { pending, run } = useRun();
  const confirm = useConfirm();
  const [v, setV] = useState({
    fromDestinationId: leg?.fromDestinationId ?? "",
    toDestinationId: leg?.toDestinationId ?? "",
    fromLabel: leg?.fromLabel ?? "",
    toLabel: leg?.toLabel ?? "",
    mode: leg?.mode ?? "flight",
    departAt: leg?.departAt ?? "",
    arriveAt: leg?.arriveAt ?? "",
    durationMin: leg?.durationMin ?? 120,
    costVnd: leg?.costVnd ?? 0,
    costMode: leg?.costMode ?? "per_person",
    participants: leg?.participants ?? null,
    overnight: leg?.overnight ?? false,
    luggageNote: leg?.luggageNote ?? "",
    bookingRef: leg?.bookingRef ?? "",
    status: leg?.status ?? "idea",
    notes: leg?.notes ?? "",
  });
  const dest = (id: string) => destinations.find((d) => d.id === id)?.name ?? "";
  const save = async () => {
    let confirmFixed = false;
    if (leg?.isFixed) {
      confirmFixed = await confirm({ title: "Change a booked flight?", description: "This flight was pre-booked. Only save if the booking itself has changed.", confirmLabel: "Yes, the booking changed" });
      if (!confirmFixed) return;
    }
    run(
      () =>
        saveTransportLeg(
          tripId,
          leg?.id ?? null,
          {
            fromDestinationId: v.fromDestinationId || null,
            toDestinationId: v.toDestinationId || null,
            fromLabel: v.fromLabel || dest(v.fromDestinationId),
            toLabel: v.toLabel || dest(v.toDestinationId),
            mode: v.mode as "flight",
            departAt: v.departAt || null,
            arriveAt: v.arriveAt || null,
            durationMin: v.durationMin || null,
            costVnd: v.costVnd,
            costMode: v.costMode,
            participants: v.participants,
            overnight: v.overnight,
            luggageNote: v.luggageNote || null,
            bookingRef: v.bookingRef || null,
            status: v.status,
            notes: v.notes || null,
          },
          { confirmFixedChange: confirmFixed },
        ),
      leg ? "Transport updated" : "Transport added",
      onClose,
    );
  };
  return (
    <Dialog open onClose={onClose} title={leg ? "Edit transport" : "Add transport"} size="lg"
      footer={
        <>
          {leg && !leg.isFixed && <Button variant="ghost" className="mr-auto text-bad" disabled={pending} onClick={async () => (await confirm({ title: "Delete this transport?", confirmLabel: "Delete", tone: "danger" })) && run(() => deleteTransportLeg(leg.id), "Deleted", onClose)}>Delete</Button>}
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button disabled={pending || !(v.fromLabel || v.fromDestinationId) || !(v.toLabel || v.toDestinationId)} onClick={save}>Save</Button>
        </>
      }>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="From (destination)" name="l-from">{(p) => <Select {...p} value={v.fromDestinationId} onChange={(e) => setV({ ...v, fromDestinationId: e.target.value, fromLabel: dest(e.target.value) })}><option value="">Other / custom</option>{destinations.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}</Select>}</Field>
        <Field label="To (destination)" name="l-to">{(p) => <Select {...p} value={v.toDestinationId} onChange={(e) => setV({ ...v, toDestinationId: e.target.value, toLabel: dest(e.target.value) })}><option value="">Other / custom</option>{destinations.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}</Select>}</Field>
        <Field label="From label" name="l-fl">{(p) => <Input {...p} value={v.fromLabel} onChange={(e) => setV({ ...v, fromLabel: e.target.value })} placeholder="e.g. Tan Son Nhat (SGN)" />}</Field>
        <Field label="To label" name="l-tl">{(p) => <Input {...p} value={v.toLabel} onChange={(e) => setV({ ...v, toLabel: e.target.value })} />}</Field>
        <Field label="Mode" name="l-mode">{(p) => <Select {...p} value={v.mode} onChange={(e) => setV({ ...v, mode: e.target.value })}>{Object.entries(TRANSPORT_LABELS).map(([k, l]) => <option key={k} value={k}>{l}</option>)}</Select>}</Field>
        <Field label="Status" name="l-status">{(p) => <Select {...p} value={v.status} onChange={(e) => setV({ ...v, status: e.target.value as "idea" })}><option value="idea">Idea (estimate)</option><option value="quoted">Quoted</option><option value="booked">Booked</option></Select>}</Field>
        <Field label="Departure (local time)" name="l-dep">{(p) => <Input {...p} type="datetime-local" value={v.departAt} onChange={(e) => setV({ ...v, departAt: e.target.value })} />}</Field>
        <Field label="Arrival (local time)" name="l-arr" hint="Leave blank to calculate from duration">{(p) => <Input {...p} type="datetime-local" value={v.arriveAt} onChange={(e) => setV({ ...v, arriveAt: e.target.value })} />}</Field>
        <Field label="Duration (minutes)" name="l-dur">{(p) => <Input {...p} type="number" min={0} step={5} value={v.durationMin} onChange={(e) => setV({ ...v, durationMin: Number(e.target.value) })} />}</Field>
        <Field label="Booking reference" name="l-ref">{(p) => <Input {...p} value={v.bookingRef} onChange={(e) => setV({ ...v, bookingRef: e.target.value })} />}</Field>
        <MoneyInput label="Cost (₹)" name="l-cost" vnd={v.costVnd} onChange={(c) => setV({ ...v, costVnd: c })} />
        <Field label="Cost is" name="l-mode2">{(p) => <Select {...p} value={v.costMode} onChange={(e) => setV({ ...v, costMode: e.target.value as "total" })}><option value="per_person">Per person</option><option value="total">Total, split (e.g. private van)</option></Select>}</Field>
        <label className="flex items-center gap-2 text-sm sm:col-span-2"><input type="checkbox" checked={v.overnight} onChange={(e) => setV({ ...v, overnight: e.target.checked })} className="size-4 accent-[var(--brand)]" />Overnight journey (counts as that night's accommodation)</label>
        <div className="sm:col-span-2"><Field label="Luggage considerations" name="l-lug">{(p) => <Input {...p} value={v.luggageNote} onChange={(e) => setV({ ...v, luggageNote: e.target.value })} placeholder="e.g. 7 kg cabin only; pay for hold bags in advance" />}</Field></div>
        <div className="sm:col-span-2"><Participants members={members} value={v.participants} onChange={(x) => setV({ ...v, participants: x })} /></div>
        <div className="sm:col-span-2"><Field label="Notes" name="l-notes">{(p) => <Textarea {...p} rows={2} value={v.notes} onChange={(e) => setV({ ...v, notes: e.target.value })} />}</Field></div>
      </div>
    </Dialog>
  );
}

/* ───────── Accommodation ───────── */

export function StayDialog({ tripId, stay, destinations, members, defaultDates, onClose }: { tripId: string; stay: StayVM | null; destinations: DestVM[]; members: MemberVM[]; defaultDates: [string, string]; onClose: () => void }) {
  const { pending, run } = useRun();
  const confirm = useConfirm();
  const fx = useFx();
  const [v, setV] = useState({
    destinationId: stay?.destinationId ?? "",
    name: stay?.name ?? "",
    type: stay?.type ?? "airbnb",
    checkIn: stay?.checkIn ?? defaultDates[0],
    checkOut: stay?.checkOut ?? defaultDates[1],
    costVnd: stay?.costVnd ?? 0,
    costMode: stay?.costMode ?? "total",
    participants: stay?.participants ?? null,
    status: stay?.status ?? "idea",
    url: stay?.url ?? "",
    notes: stay?.notes ?? "",
  });
  const nights = Math.max(0, Math.round((Date.parse(v.checkOut) - Date.parse(v.checkIn)) / 86400000));
  const n = v.participants?.length ?? members.length;
  const pp = v.costMode === "total" ? v.costVnd / Math.max(1, n) : v.costVnd;
  return (
    <Dialog open onClose={onClose} title={stay ? "Edit accommodation" : "Add accommodation"} size="lg"
      footer={
        <>
          {stay && <Button variant="ghost" className="mr-auto text-bad" disabled={pending} onClick={async () => (await confirm({ title: "Delete this stay?", confirmLabel: "Delete", tone: "danger" })) && run(() => deleteStay(stay.id), "Deleted", onClose)}>Delete</Button>}
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button disabled={pending || !v.name} onClick={() => run(() => saveStay(tripId, stay?.id ?? null, { ...v, destinationId: v.destinationId || null, type: v.type as "airbnb", url: v.url || null, notes: v.notes || null }), stay ? "Stay updated" : "Stay added", onClose)}>Save</Button>
        </>
      }>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Name" name="s-name">{(p) => <Input {...p} value={v.name} onChange={(e) => setV({ ...v, name: e.target.value })} placeholder="e.g. 4-bedroom villa, Ong Lang" />}</Field>
        <Field label="Type" name="s-type">{(p) => <Select {...p} value={v.type} onChange={(e) => setV({ ...v, type: e.target.value })}>{["airbnb", "villa", "hotel", "hostel", "guesthouse", "homestay", "cruise", "other"].map((x) => <option key={x} value={x}>{x[0]!.toUpperCase() + x.slice(1)}</option>)}</Select>}</Field>
        <Field label="Destination" name="s-dest">{(p) => <Select {...p} value={v.destinationId} onChange={(e) => setV({ ...v, destinationId: e.target.value })}><option value=""></option>{destinations.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}</Select>}</Field>
        <Field label="Status" name="s-status">{(p) => <Select {...p} value={v.status} onChange={(e) => setV({ ...v, status: e.target.value as "idea" })}><option value="idea">Idea (estimate)</option><option value="quoted">Quoted</option><option value="booked">Booked</option></Select>}</Field>
        <Field label="Check-in" name="s-in">{(p) => <Input {...p} type="date" value={v.checkIn} onChange={(e) => setV({ ...v, checkIn: e.target.value })} />}</Field>
        <Field label="Check-out" name="s-out" hint={`${nights} night${nights === 1 ? "" : "s"}`}>{(p) => <Input {...p} type="date" value={v.checkOut} onChange={(e) => setV({ ...v, checkOut: e.target.value })} />}</Field>
        <MoneyInput label={v.costMode === "total" ? "Total cost for the stay (₹)" : "Cost per person (₹)"} name="s-cost" vnd={v.costVnd} onChange={(c) => setV({ ...v, costVnd: c })} />
        <Field label="Cost is" name="s-mode" hint={`≈ ${formatInr(vndToInr(pp, fx))} per person${nights ? `, ${formatInr(vndToInr(pp / nights, fx))}/night` : ""}`}>{(p) => <Select {...p} value={v.costMode} onChange={(e) => setV({ ...v, costMode: e.target.value as "total" })}><option value="total">Total for the property, split</option><option value="per_person">Per person</option></Select>}</Field>
        <div className="sm:col-span-2"><Field label="Listing URL (optional)" name="s-url">{(p) => <Input {...p} type="url" value={v.url} onChange={(e) => setV({ ...v, url: e.target.value })} placeholder="https://" />}</Field></div>
        <div className="sm:col-span-2"><Participants members={members} value={v.participants} onChange={(x) => setV({ ...v, participants: x })} /></div>
        <div className="sm:col-span-2"><Field label="Notes" name="s-notes">{(p) => <Textarea {...p} rows={2} value={v.notes} onChange={(e) => setV({ ...v, notes: e.target.value })} />}</Field></div>
      </div>
    </Dialog>
  );
}
