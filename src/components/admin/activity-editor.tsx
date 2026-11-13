"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { saveActivity } from "@/app/actions/admin";
import { Button } from "@/components/ui/button";
import { Field, Input, Select, Textarea } from "@/components/ui/form";
import { useToast } from "@/components/ui/toast";
import { AVAILABILITY_LABELS, DECEMBER_LABELS, DIFFICULTY_LABELS, DURATION_LABELS, SUITABILITY_LABELS } from "@/content/taxonomy";

type Initial = Record<string, unknown> & {
  title: string; slug: string; destinationId: string; attractionId: string | null; kind: string; priceTier: string; summary: string; description: string; whatYouDo: string[]; steps: string[];
  durationBucket: string; durationText: string; durationHours: number; difficulty: string; intensity: number; minAge: string | null; skills: string; safety: string[]; availability: string; months: string;
  decemberStatus: string; decemberNote: string; weatherDependent: boolean; minParticipants: string | null; suitability: string[]; groupNote: string; booking: string; cancellation: string | null;
  bring: string[]; wear: string[]; transport: string; accessibility: string; providerLinks: { name: string; url: string }[]; featured: boolean; status: string; categories: string[];
  price: { minVnd: number; maxVnd: number; unit: string; basis: string; status: string; audience: string; includes: string[]; excludes: string[]; extras: string[]; validity: string | null } | null;
};

const STATUSES = ["verified_official", "verified_provider", "estimated", "community", "needs_verification", "temporarily_unavailable"];

export function ActivityEditor({ id, initial, categories, destinations, attractions }: { id: string | null; initial: Initial | null; categories: { slug: string; name: string; kind: string }[]; destinations: { id: string; name: string }[]; attractions: { id: string; name: string; destinationId: string }[] }) {
  const toast = useToast();
  const router = useRouter();
  const [pending, start] = useTransition();
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string>();
  const i = initial;
  const [v, setV] = useState({
    title: i?.title ?? "", slug: i?.slug ?? "", destinationId: i?.destinationId ?? "", attractionId: i?.attractionId ?? "", kind: i?.kind ?? "activity", priceTier: i?.priceTier ?? "paid",
    summary: i?.summary ?? "", description: i?.description ?? "", whatYouDo: (i?.whatYouDo ?? []).join("\n"), steps: (i?.steps ?? []).join("\n"),
    durationBucket: i?.durationBucket ?? "half_day", durationText: i?.durationText ?? "", durationHours: String(i?.durationHours ?? 4), difficulty: i?.difficulty ?? "easy", intensity: String(i?.intensity ?? 2),
    minAge: i?.minAge ?? "", skills: i?.skills ?? "", safety: (i?.safety ?? []).join("\n"), availability: i?.availability ?? "not_verified", months: i?.months ?? "222222222222",
    decemberStatus: i?.decemberStatus ?? "unknown", decemberNote: i?.decemberNote ?? "", weatherDependent: i?.weatherDependent ?? false, minParticipants: i?.minParticipants ?? "",
    suitability: i?.suitability ?? [], groupNote: i?.groupNote ?? "", booking: i?.booking ?? "", cancellation: i?.cancellation ?? "", bring: (i?.bring ?? []).join("\n"), wear: (i?.wear ?? []).join("\n"),
    transport: i?.transport ?? "", accessibility: i?.accessibility ?? "", providerLinks: (i?.providerLinks ?? []).map((p) => `${p.name} | ${p.url}`).join("\n"), featured: i?.featured ?? false, status: i?.status ?? "draft",
    categories: i?.categories ?? [],
    price: { minVnd: String(i?.price?.minVnd ?? 0), maxVnd: String(i?.price?.maxVnd ?? 0), unit: i?.price?.unit ?? "per_person", basis: i?.price?.basis ?? "", status: i?.price?.status ?? "estimated", audience: i?.price?.audience ?? "adult", includes: (i?.price?.includes ?? []).join("\n"), excludes: (i?.price?.excludes ?? []).join("\n"), extras: (i?.price?.extras ?? []).join("\n"), validity: i?.price?.validity ?? "" },
  });
  const set = (k: keyof typeof v) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => setV({ ...v, [k]: e.target.value });
  const setP = (k: keyof typeof v.price) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => setV({ ...v, price: { ...v.price, [k]: e.target.value } });
  const err = (k: string) => errors[k];

  const submit = (status?: string) =>
    start(async () => {
      setFormError(undefined);
      const payload = { ...v, status: (status ?? v.status) as "draft", attractionId: v.attractionId || null, kind: v.kind as "activity", priceTier: v.priceTier as "paid", durationBucket: v.durationBucket as "half_day", difficulty: v.difficulty as "easy", availability: v.availability as "seasonal", decemberStatus: v.decemberStatus as "good", suitability: v.suitability as "groups"[], price: { ...v.price, unit: v.price.unit as "per_person", status: v.price.status as "estimated", audience: v.price.audience as "adult" } };
      const r = await saveActivity(id, payload);
      if (!r.ok) {
        setErrors(r.fieldErrors ?? {});
        setFormError(r.error);
        toast({ tone: "error", title: "Not saved", description: r.error });
        return;
      }
      setErrors({});
      toast({ tone: "success", title: "Activity saved" });
      if (!id) router.push(`/admin/activities/${r.id}`);
      else router.refresh();
    });

  return (
    <form className="mt-6 space-y-8" onSubmit={(e) => { e.preventDefault(); submit(); }} noValidate>
      {formError && <p role="alert" className="rounded-md bg-bad-soft px-4 py-3 text-sm text-bad">{formError}</p>}
      <Section title="Basics">
        <Field label="Title" name="title" error={err("title")}>{(p) => <Input {...p} value={v.title} onChange={set("title")} />}</Field>
        <Field label="URL slug" name="slug" hint="Leave blank to generate from the title">{(p) => <Input {...p} value={v.slug} onChange={set("slug")} />}</Field>
        <Field label="Destination" name="destinationId" error={err("destinationId")}>{(p) => <Select {...p} value={v.destinationId} onChange={set("destinationId")}><option value="">Choose…</option>{destinations.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}</Select>}</Field>
        <Field label="Attraction (optional)" name="attractionId">{(p) => <Select {...p} value={v.attractionId} onChange={set("attractionId")}><option value="">None</option>{attractions.filter((a) => a.destinationId === v.destinationId).map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}</Select>}</Field>
        <Field label="Kind" name="kind">{(p) => <Select {...p} value={v.kind} onChange={set("kind")}>{["activity", "attraction_visit", "food", "nightlife", "tour", "show", "shopping"].map((k) => <option key={k}>{k}</option>)}</Select>}</Field>
        <Field label="Free / paid" name="priceTier">{(p) => <Select {...p} value={v.priceTier} onChange={set("priceTier")}><option value="free">Free</option><option value="low">Low-cost</option><option value="paid">Paid</option></Select>}</Field>
        <div className="sm:col-span-2"><Field label="Summary (≤ 160 characters, shown on cards)" name="summary" error={err("summary")} hint={`${v.summary.length}/160`}>{(p) => <Textarea {...p} rows={2} value={v.summary} onChange={set("summary")} />}</Field></div>
        <div className="sm:col-span-2"><Field label="Description" name="description" error={err("description")}>{(p) => <Textarea {...p} rows={5} value={v.description} onChange={set("description")} />}</Field></div>
        <fieldset className="sm:col-span-2">
          <legend className="mb-2 text-sm font-medium">Categories &amp; themes</legend>
          <div className="flex flex-wrap gap-x-4 gap-y-1.5">
            {categories.map((c) => (
              <label key={c.slug} className="flex items-center gap-1.5 text-sm"><input type="checkbox" className="size-4 accent-[var(--brand)]" checked={v.categories.includes(c.slug)} onChange={(e) => setV({ ...v, categories: e.target.checked ? [...v.categories, c.slug] : v.categories.filter((x) => x !== c.slug) })} />{c.name}{c.kind === "theme" && <span className="text-xs text-muted">(theme)</span>}</label>
            ))}
          </div>
        </fieldset>
      </Section>
      <Section title="Experience">
        <Field label="What you'll do (one per line)" name="whatYouDo">{(p) => <Textarea {...p} rows={5} value={v.whatYouDo} onChange={set("whatYouDo")} />}</Field>
        <Field label="Step by step (one per line)" name="steps">{(p) => <Textarea {...p} rows={5} value={v.steps} onChange={set("steps")} />}</Field>
        <Field label="Duration bucket" name="durationBucket">{(p) => <Select {...p} value={v.durationBucket} onChange={set("durationBucket")}>{Object.entries(DURATION_LABELS).map(([k, l]) => <option key={k} value={k}>{l}</option>)}</Select>}</Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Duration text" name="durationText" error={err("durationText")}>{(p) => <Input {...p} value={v.durationText} onChange={set("durationText")} placeholder="4–5 hours" />}</Field>
          <Field label="Hours (for planning)" name="durationHours">{(p) => <Input {...p} type="number" step="0.5" min={0} value={v.durationHours} onChange={set("durationHours")} />}</Field>
        </div>
        <Field label="Difficulty" name="difficulty">{(p) => <Select {...p} value={v.difficulty} onChange={set("difficulty")}>{Object.entries(DIFFICULTY_LABELS).map(([k, l]) => <option key={k} value={k}>{l}</option>)}</Select>}</Field>
        <Field label="Intensity (1–5)" name="intensity">{(p) => <Input {...p} type="number" min={1} max={5} value={v.intensity} onChange={set("intensity")} />}</Field>
        <Field label="Recommended age" name="minAge">{(p) => <Input {...p} value={v.minAge} onChange={set("minAge")} />}</Field>
        <Field label="Minimum participants" name="minParticipants">{(p) => <Input {...p} value={v.minParticipants} onChange={set("minParticipants")} />}</Field>
        <div className="sm:col-span-2"><Field label="Skills required" name="skills">{(p) => <Input {...p} value={v.skills} onChange={set("skills")} />}</Field></div>
        <Field label="Safety notes (one per line)" name="safety">{(p) => <Textarea {...p} rows={4} value={v.safety} onChange={set("safety")} />}</Field>
        <div className="space-y-3">
          <Field label="What to bring (one per line)" name="bring">{(p) => <Textarea {...p} rows={2} value={v.bring} onChange={set("bring")} />}</Field>
          <Field label="What to wear (one per line)" name="wear">{(p) => <Textarea {...p} rows={2} value={v.wear} onChange={set("wear")} />}</Field>
        </div>
      </Section>
      <Section title="Seasonality & availability">
        <Field label="Availability" name="availability">{(p) => <Select {...p} value={v.availability} onChange={set("availability")}>{Object.entries(AVAILABILITY_LABELS).map(([k, l]) => <option key={k} value={k}>{l}</option>)}</Select>}</Field>
        <Field label="Months (Jan→Dec, 0 avoid … 3 excellent)" name="months" error={err("months")} hint="12 digits, e.g. 333322110123">{(p) => <Input {...p} value={v.months} onChange={set("months")} maxLength={12} className="field font-mono tracking-widest" />}</Field>
        <Field label="December status" name="decemberStatus">{(p) => <Select {...p} value={v.decemberStatus} onChange={set("decemberStatus")}>{Object.entries(DECEMBER_LABELS).map(([k, l]) => <option key={k} value={k}>{l.label}</option>)}</Select>}</Field>
        <label className="flex items-center gap-2 self-end pb-2 text-sm"><input type="checkbox" className="size-4 accent-[var(--brand)]" checked={v.weatherDependent} onChange={(e) => setV({ ...v, weatherDependent: e.target.checked })} />Weather-dependent</label>
        <div className="sm:col-span-2"><Field label="December note" name="decemberNote">{(p) => <Textarea {...p} rows={2} value={v.decemberNote} onChange={set("decemberNote")} />}</Field></div>
      </Section>
      <Section title="Price">
        <Field label="Min (VND)" name="price.minVnd" error={err("price.minVnd")}>{(p) => <Input {...p} type="number" min={0} step={1000} value={v.price.minVnd} onChange={setP("minVnd")} />}</Field>
        <Field label="Max (VND)" name="price.maxVnd">{(p) => <Input {...p} type="number" min={0} step={1000} value={v.price.maxVnd} onChange={setP("maxVnd")} />}</Field>
        <Field label="Unit" name="price.unit">{(p) => <Select {...p} value={v.price.unit} onChange={setP("unit")}><option value="per_person">Per person</option><option value="per_group">Per group</option><option value="per_boat">Per boat</option><option value="per_vehicle">Per vehicle</option></Select>}</Field>
        <Field label="Data status" name="price.status" hint="Use verified only with a verified source attached">{(p) => <Select {...p} value={v.price.status} onChange={setP("status")}>{STATUSES.map((s) => <option key={s} value={s}>{s.replace(/_/g, " ")}</option>)}</Select>}</Field>
        <Field label="Audience" name="price.audience">{(p) => <Select {...p} value={v.price.audience} onChange={setP("audience")}><option value="adult">Adult</option><option value="child">Child</option><option value="all">All ages</option></Select>}</Field>
        <Field label="Validity" name="price.validity">{(p) => <Input {...p} value={v.price.validity} onChange={setP("validity")} placeholder="e.g. 2026 season" />}</Field>
        <div className="sm:col-span-2"><Field label="Basis (how was this figure obtained?)" name="price.basis">{(p) => <Textarea {...p} rows={2} value={v.price.basis} onChange={setP("basis")} />}</Field></div>
        <Field label="Included (one per line)" name="price.includes">{(p) => <Textarea {...p} rows={3} value={v.price.includes} onChange={setP("includes")} />}</Field>
        <Field label="Excluded (one per line)" name="price.excludes">{(p) => <Textarea {...p} rows={3} value={v.price.excludes} onChange={setP("excludes")} />}</Field>
        <Field label="Additional charges (one per line)" name="price.extras">{(p) => <Textarea {...p} rows={2} value={v.price.extras} onChange={setP("extras")} />}</Field>
      </Section>
      <Section title="Logistics & suitability">
        <fieldset className="sm:col-span-2">
          <legend className="mb-2 text-sm font-medium">Suitable for</legend>
          <div className="flex flex-wrap gap-4">{Object.entries(SUITABILITY_LABELS).map(([k, l]) => <label key={k} className="flex items-center gap-1.5 text-sm"><input type="checkbox" className="size-4 accent-[var(--brand)]" checked={v.suitability.includes(k)} onChange={(e) => setV({ ...v, suitability: e.target.checked ? [...v.suitability, k] : v.suitability.filter((x) => x !== k) })} />{l}</label>)}</div>
        </fieldset>
        <Field label="Group note" name="groupNote">{(p) => <Textarea {...p} rows={2} value={v.groupNote} onChange={set("groupNote")} />}</Field>
        <Field label="Booking requirements" name="booking">{(p) => <Textarea {...p} rows={2} value={v.booking} onChange={set("booking")} />}</Field>
        <Field label="Cancellation (only if sourced)" name="cancellation">{(p) => <Textarea {...p} rows={2} value={v.cancellation} onChange={set("cancellation")} />}</Field>
        <Field label="Transport / travel time" name="transport">{(p) => <Textarea {...p} rows={2} value={v.transport} onChange={set("transport")} />}</Field>
        <Field label="Accessibility" name="accessibility">{(p) => <Textarea {...p} rows={2} value={v.accessibility} onChange={set("accessibility")} />}</Field>
        <Field label="Official provider links (Name | https://… per line)" name="providerLinks" error={err("providerLinks")}>{(p) => <Textarea {...p} rows={2} value={v.providerLinks} onChange={set("providerLinks")} />}</Field>
      </Section>
      <div className="sticky bottom-16 z-10 flex flex-wrap items-center gap-2 rounded-md border border-line bg-surface p-3 shadow-[var(--shadow-pop)] lg:bottom-4">
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" className="size-4 accent-[var(--brand)]" checked={v.featured} onChange={(e) => setV({ ...v, featured: e.target.checked })} />Featured</label>
        <span className="ml-auto text-xs text-muted">Status: <strong>{v.status}</strong></span>
        <Button type="button" variant="outline" disabled={pending} onClick={() => submit("draft")}>Save draft</Button>
        <Button type="button" disabled={pending} onClick={() => submit("published")}>Save &amp; publish</Button>
      </div>
    </form>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <fieldset className="rounded-md border border-line bg-surface p-5">
      <legend className="px-1 font-sans text-base font-semibold">{title}</legend>
      <div className="grid gap-4 sm:grid-cols-2">{children}</div>
    </fieldset>
  );
}
