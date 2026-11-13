"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { saveDestination } from "@/app/actions/admin";
import { Button } from "@/components/ui/button";
import { Field, Input, Select, Textarea } from "@/components/ui/form";
import { useToast } from "@/components/ui/toast";
import { KIND_LABELS } from "@/content/taxonomy";
import type { t } from "@/db/client";

type D = typeof t.destinations.$inferSelect;
const J = (x: unknown) => JSON.stringify(x, null, 2);
const BLANK_PRACTICAL = { howToReach: "", gettingAround: "", localTransport: "", travelTimes: "", accommodationAreas: [], safety: [], packing: [], regulations: [], connectivity: "", payments: "", accessibility: "" };

export function DestinationEditor({ id, initial: d, regions, parents }: { id: string | null; initial: D | null; regions: { id: string; name: string }[]; parents: { id: string; name: string }[] }) {
  const toast = useToast();
  const router = useRouter();
  const [pending, start] = useTransition();
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [v, setV] = useState({
    name: d?.name ?? "", slug: d?.slug ?? "", localName: d?.localName ?? "", kind: d?.kind ?? "city", regionId: d?.regionId ?? regions[0]?.id ?? "", parentId: d?.parentId ?? "",
    province: d?.province ?? "", formerProvince: d?.formerProvince ?? "", lat: String(d?.lat ?? ""), lng: String(d?.lng ?? ""), tagline: d?.tagline ?? "", summary: d?.summary ?? "", intro: d?.intro ?? "",
    whySpecial: d?.whySpecial ?? "", whyVisit: (d?.whyVisit ?? []).join("\n"), uniqueText: d?.uniqueText ?? "", idealFor: (d?.idealFor ?? []).join("\n"), daysMin: String(d?.daysMin ?? 2), daysMax: String(d?.daysMax ?? 3),
    travelStyle: d?.travelStyle ?? "", spendingLevel: String(d?.spendingLevel ?? 2), adventureLevel: String(d?.adventureLevel ?? 2), popularity: String(d?.popularity ?? 50), highlights: (d?.highlights ?? []).join("\n"),
    months: d?.months ?? "222222222222", weather: d?.weather ?? "", decemberNote: d?.decemberNote ?? "", featured: d?.featured ?? false, status: d?.status ?? "draft",
    food: J(d?.food ?? { dishes: [], markets: [], cafes: [], experiences: [], dietaryNotes: "" }), nightlife: J(d?.nightlife ?? []), practical: J(d?.practical ?? BLANK_PRACTICAL), transportHubs: J(d?.transportHubs ?? []),
  });
  const set = (k: keyof typeof v) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => setV({ ...v, [k]: e.target.value });
  const submit = (status?: string) => start(async () => {
    const r = await saveDestination(id, { ...v, status: (status ?? v.status) as "draft", kind: v.kind as "city", parentId: v.parentId || null });
    if (!r.ok) { setErrors(r.fieldErrors ?? {}); toast({ tone: "error", title: "Not saved", description: r.error }); return; }
    toast({ tone: "success", title: "Destination saved" });
    if (!id) router.push(`/admin/destinations/${r.id}`); else router.refresh();
  });
  const F = ({ k, label, area, rows = 3, hint, type }: { k: keyof typeof v; label: string; area?: boolean; rows?: number; hint?: string; type?: string }) => (
    <Field label={label} name={k} error={errors[k]} hint={hint}>{(p) => (area ? <Textarea {...p} rows={rows} value={String(v[k])} onChange={set(k)} /> : <Input {...p} type={type} value={String(v[k])} onChange={set(k)} />)}</Field>
  );
  return (
    <form className="mt-6 space-y-6" onSubmit={(e) => { e.preventDefault(); submit(); }} noValidate>
      <fieldset className="grid gap-4 rounded-md border border-line bg-surface p-5 sm:grid-cols-2">
        <legend className="px-1 font-semibold">Identity &amp; location</legend>
        {F({ k: "name", label: "Name" })}{F({ k: "slug", label: "Slug", hint: "Blank = from name" })}{F({ k: "localName", label: "Vietnamese name" })}
        <Field label="Kind" name="kind">{(p) => <Select {...p} value={v.kind} onChange={set("kind")}>{Object.entries(KIND_LABELS).map(([k, l]) => <option key={k} value={k}>{l}</option>)}</Select>}</Field>
        <Field label="Region" name="regionId">{(p) => <Select {...p} value={v.regionId} onChange={set("regionId")}>{regions.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}</Select>}</Field>
        <Field label="Parent destination" name="parentId">{(p) => <Select {...p} value={v.parentId} onChange={set("parentId")}><option value="">None</option>{parents.map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}</Select>}</Field>
        {F({ k: "province", label: "Province (post-2025)" })}{F({ k: "formerProvince", label: "Former province" })}
        {F({ k: "lat", label: "Latitude", type: "number" })}{F({ k: "lng", label: "Longitude", type: "number" })}
      </fieldset>
      <fieldset className="grid gap-4 rounded-md border border-line bg-surface p-5 sm:grid-cols-2">
        <legend className="px-1 font-semibold">Editorial</legend>
        <div className="sm:col-span-2">{F({ k: "tagline", label: "Tagline (≤ 90)" })}</div>
        <div className="sm:col-span-2">{F({ k: "summary", label: "Summary", area: true, rows: 2 })}</div>
        <div className="sm:col-span-2">{F({ k: "intro", label: "Introduction", area: true, rows: 5 })}</div>
        {F({ k: "whySpecial", label: "What's special", area: true })}{F({ k: "uniqueText", label: "What makes it unique", area: true })}
        {F({ k: "whyVisit", label: "Why visit (one per line)", area: true })}{F({ k: "idealFor", label: "Ideal for (one per line)", area: true })}
        {F({ k: "highlights", label: "Highlights (one per line)", area: true })}{F({ k: "travelStyle", label: "Best travel style", area: true })}
        <div className="grid grid-cols-2 gap-3">{F({ k: "daysMin", label: "Min days", type: "number" })}{F({ k: "daysMax", label: "Max days", type: "number" })}</div>
        <div className="grid grid-cols-3 gap-3">{F({ k: "spendingLevel", label: "Spend 1–4", type: "number" })}{F({ k: "adventureLevel", label: "Adventure 1–4", type: "number" })}{F({ k: "popularity", label: "Popularity", type: "number" })}</div>
      </fieldset>
      <fieldset className="grid gap-4 rounded-md border border-line bg-surface p-5 sm:grid-cols-2">
        <legend className="px-1 font-semibold">Seasons</legend>
        {F({ k: "months", label: "Months (12 digits 0–3)" })}
        {F({ k: "weather", label: "Weather", area: true })}
        <div className="sm:col-span-2">{F({ k: "decemberNote", label: "December note", area: true, rows: 2 })}</div>
      </fieldset>
      <fieldset className="grid gap-4 rounded-md border border-line bg-surface p-5 lg:grid-cols-2">
        <legend className="px-1 font-semibold">Structured content (JSON)</legend>
        <p className="text-xs text-muted lg:col-span-2">Advanced fields. Keep the same structure as existing destinations, validation will reject malformed JSON.</p>
        {(["food", "nightlife", "practical", "transportHubs"] as const).map((k) => (
          <Field key={k} label={k} name={k}>{(p) => <Textarea {...p} rows={10} className="field font-mono text-xs" value={v[k]} onChange={set(k)} spellCheck={false} />}</Field>
        ))}
      </fieldset>
      <div className="sticky bottom-16 z-10 flex flex-wrap items-center gap-2 rounded-md border border-line bg-surface p-3 shadow-[var(--shadow-pop)] lg:bottom-4">
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" className="size-4 accent-[var(--brand)]" checked={v.featured} onChange={(e) => setV({ ...v, featured: e.target.checked })} />Featured</label>
        <span className="ml-auto text-xs text-muted">Status: <strong>{v.status}</strong></span>
        <Button type="button" variant="outline" disabled={pending} onClick={() => submit("draft")}>Save draft</Button>
        <Button type="button" disabled={pending} onClick={() => submit("published")}>Save &amp; publish</Button>
      </div>
    </form>
  );
}
