"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { saveAttraction } from "@/app/actions/admin";
import { Button } from "@/components/ui/button";
import { Field, Input, Select, Textarea } from "@/components/ui/form";
import { useToast } from "@/components/ui/toast";
import type { t } from "@/db/client";

const STATUSES = ["verified_official", "verified_provider", "estimated", "community", "needs_verification", "temporarily_unavailable"];
const KINDS = ["landmark", "museum", "temple", "pagoda", "church", "beach", "viewpoint", "market", "park", "lake", "cave", "waterfall", "heritage_site", "nature_reserve", "theme_park", "village", "island", "street", "bridge", "mountain", "farm", "other"];

export function AttractionEditor({ id, initial: a, destinations }: { id: string | null; initial: typeof t.attractions.$inferSelect | null; destinations: { id: string; name: string }[] }) {
  const toast = useToast();
  const router = useRouter();
  const [pending, start] = useTransition();
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [v, setV] = useState({
    name: a?.name ?? "", slug: a?.slug ?? "", destinationId: a?.destinationId ?? "", localName: a?.localName ?? "", kind: a?.kind ?? "landmark", lat: a?.lat != null ? String(a.lat) : "", lng: a?.lng != null ? String(a.lng) : "",
    description: a?.description ?? "", whatToSee: (a?.whatToSee ?? []).join("\n"), whatToDo: (a?.whatToDo ?? []).join("\n"), openingHoursText: a?.openingHoursText ?? "Not verified: check the official site or ask locally before visiting", openingHoursStatus: a?.openingHoursStatus ?? "needs_verification",
    feeText: a?.feeText ?? "Not verified", feeMinVnd: a?.feeMinVnd != null ? String(a.feeMinVnd) : "", feeMaxVnd: a?.feeMaxVnd != null ? String(a.feeMaxVnd) : "", feeStatus: a?.feeStatus ?? "needs_verification",
    visitDuration: a?.visitDuration ?? "", accessibility: a?.accessibility ?? "", distanceFromCentre: a?.distanceFromCentre ?? "", seasonality: a?.seasonality ?? "", officialUrl: a?.officialUrl ?? "", booking: a?.booking ?? "", isFree: a?.isFree ?? false, status: a?.status ?? "draft",
  });
  const set = (k: keyof typeof v) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => setV({ ...v, [k]: e.target.value });
  const submit = (status?: string) => start(async () => {
    const r = await saveAttraction(id, { ...v, status: (status ?? v.status) as "draft", openingHoursStatus: v.openingHoursStatus as "estimated", feeStatus: v.feeStatus as "estimated", lat: v.lat ? Number(v.lat) : null, lng: v.lng ? Number(v.lng) : null, feeMinVnd: v.feeMinVnd ? Number(v.feeMinVnd) : null, feeMaxVnd: v.feeMaxVnd ? Number(v.feeMaxVnd) : null });
    if (!r.ok) { setErrors(r.fieldErrors ?? {}); toast({ tone: "error", title: "Not saved", description: r.error }); return; }
    toast({ tone: "success", title: "Attraction saved" });
    if (!id) router.push(`/admin/attractions/${r.id}`); else router.refresh();
  });
  const F = (k: keyof typeof v, label: string, opts: { area?: boolean; type?: string; hint?: string } = {}) => (
    <Field label={label} name={k} error={errors[k]} hint={opts.hint}>{(p) => (opts.area ? <Textarea {...p} rows={3} value={String(v[k])} onChange={set(k)} /> : <Input {...p} type={opts.type} value={String(v[k])} onChange={set(k)} />)}</Field>
  );
  return (
    <form className="mt-6 grid gap-4 rounded-md border border-line bg-surface p-5 sm:grid-cols-2" onSubmit={(e) => { e.preventDefault(); submit(); }} noValidate>
      {F("name", "Name")}{F("slug", "Slug", { hint: "Blank = from name" })}
      <Field label="Destination" name="destinationId" error={errors.destinationId}>{(p) => <Select {...p} value={v.destinationId} onChange={set("destinationId")}><option value="">Choose…</option>{destinations.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}</Select>}</Field>
      <Field label="Kind" name="kind">{(p) => <Select {...p} value={v.kind} onChange={set("kind")}>{KINDS.map((k) => <option key={k} value={k}>{k.replace("_", " ")}</option>)}</Select>}</Field>
      {F("localName", "Vietnamese name")}{F("distanceFromCentre", "Distance from centre")}
      {F("lat", "Latitude", { type: "number" })}{F("lng", "Longitude", { type: "number" })}
      <div className="sm:col-span-2">{F("description", "Description", { area: true })}</div>
      {F("whatToSee", "What to see (one per line)", { area: true })}{F("whatToDo", "What to do (one per line)", { area: true })}
      {F("openingHoursText", "Opening hours (local time, days, exceptions)", { area: true })}
      <Field label="Hours data status" name="openingHoursStatus">{(p) => <Select {...p} value={v.openingHoursStatus} onChange={set("openingHoursStatus")}>{STATUSES.map((s) => <option key={s} value={s}>{s.replace(/_/g, " ")}</option>)}</Select>}</Field>
      {F("feeText", "Entrance fee", { area: true })}
      <div className="grid grid-cols-3 gap-2">
        {F("feeMinVnd", "Min ₫", { type: "number" })}{F("feeMaxVnd", "Max ₫", { type: "number" })}
        <Field label="Fee status" name="feeStatus">{(p) => <Select {...p} value={v.feeStatus} onChange={set("feeStatus")}>{STATUSES.map((s) => <option key={s} value={s}>{s.replace(/_/g, " ")}</option>)}</Select>}</Field>
      </div>
      {F("visitDuration", "Visit duration")}{F("seasonality", "Seasonality", { area: true })}
      {F("accessibility", "Accessibility", { area: true })}{F("booking", "Booking information", { area: true })}
      {F("officialUrl", "Official website", { type: "url" })}
      <label className="flex items-center gap-2 self-end pb-2 text-sm"><input type="checkbox" className="size-4 accent-[var(--brand)]" checked={v.isFree} onChange={(e) => setV({ ...v, isFree: e.target.checked })} />Free entry</label>
      <div className="flex gap-2 sm:col-span-2">
        <Button type="button" variant="outline" disabled={pending} onClick={() => submit("draft")}>Save draft</Button>
        <Button type="button" disabled={pending} onClick={() => submit("published")}>Save &amp; publish</Button>
      </div>
    </form>
  );
}
