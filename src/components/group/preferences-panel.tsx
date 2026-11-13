"use client";

import { Pencil } from "lucide-react";
import { useState, useTransition } from "react";
import { savePreferences } from "@/app/actions/trips";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Field, Input, Select, Textarea } from "@/components/ui/form";
import { useToast } from "@/components/ui/toast";
import { cn } from "@/lib/utils";

type Prefs = {
  interests: string[];
  preferredDestinations: string[];
  adventureTolerance: number;
  fitness: number;
  foodPreferences: string[];
  accommodation: string;
  nightlife: number;
  budgetInr: number | null;
  freeVsPaid: number;
  avoid: string | null;
};

const INTERESTS = ["Adventure & thrill", "Beaches & islands", "Nightlife & socialising", "Nature & photography", "Street food", "Shopping & markets", "Hidden gems", "Free activities", "History & culture", "Wellness & relaxation", "Tech & networking"];
const FOOD = ["Vegetarian", "Eggetarian", "Vegan", "Jain", "Halal", "No beef", "No pork", "Seafood lover", "Mild spice", "Nut allergy", "Shellfish allergy"];
const ACCOM = [
  ["shared_property", "Whole property for the group"],
  ["hotel", "Hotel rooms"],
  ["hostel", "Social hostel"],
  ["homestay", "Homestays"],
  ["no_preference", "No preference"],
] as const;

const LEVEL = { adventureTolerance: ["", "Very gentle", "Gentle", "Some thrills", "Bring it on", "Extreme"], fitness: ["", "Low", "Light", "Moderate", "Fit", "Very fit"], nightlife: ["", "Early nights", "Occasional", "Some nights out", "Most nights", "Every night"], freeVsPaid: ["", "Mostly free", "Lean free", "Balanced", "Happy to pay", "Pay for the best"] };

export function PreferencesPanel({
  myMemberId,
  canProxy,
  members,
  destinations,
}: {
  myMemberId: string;
  canProxy: boolean;
  members: { id: string; name: string; color: string; joined: boolean; prefs: Prefs | null }[];
  destinations: { slug: string; name: string }[];
}) {
  const [editing, setEditing] = useState<string>(myMemberId);
  const me = members.find((m) => m.id === editing)!;
  const shared = members.filter((m) => m.prefs && m.prefs.interests.length);
  const tally = (pick: (p: Prefs) => string[]) => {
    const map = new Map<string, number>();
    for (const m of shared) for (const x of pick(m.prefs!)) map.set(x, (map.get(x) ?? 0) + 1);
    return [...map.entries()].sort((a, b) => b[1] - a[1]);
  };
  const avg = (k: "adventureTolerance" | "fitness" | "nightlife" | "freeVsPaid") => (shared.length ? shared.reduce((s, m) => s + m.prefs![k], 0) / shared.length : null);
  const destName = (s: string) => destinations.find((d) => d.slug === s)?.name ?? s;

  return (
    <div className="grid gap-8 lg:grid-cols-12">
      <section className="lg:col-span-7" aria-labelledby="pref-h">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <h2 id="pref-h" className="text-2xl">{editing === myMemberId ? "Your preferences" : `Preferences for ${me.name}`}</h2>
          {canProxy && (
            <label className="text-sm">
              <span className="mr-2 text-muted">Editing</span>
              <select className="field inline-block h-9 w-auto" value={editing} onChange={(e) => setEditing(e.target.value)}>
                {members.filter((m) => m.id === myMemberId || !m.joined).map((m) => (
                  <option key={m.id} value={m.id}>{m.id === myMemberId ? `${m.name} (you)` : `${m.name}not joined`}</option>
                ))}
              </select>
            </label>
          )}
        </div>
        {editing !== myMemberId && <p className="mb-4 rounded-sm bg-highlight-soft px-3 py-2 text-sm">You're recording preferences on behalf of {me.name}, who hasn't joined yet. Once they join, only they can change these.</p>}
        <PrefForm key={editing} memberId={editing} initial={me.prefs} destinations={destinations} />
      </section>
      <aside className="lg:col-span-5">
        <h2 className="mb-4 text-2xl">The group at a glance</h2>
        <div className="space-y-4 rounded-md border border-line bg-surface p-5">
          <p className="text-sm text-muted">{shared.length} of {members.length} travellers have shared preferences.</p>
          <Bars title="Top interests" items={tally((p) => p.interests)} total={shared.length} />
          <Bars title="Most wanted destinations" items={tally((p) => p.preferredDestinations).map(([k, v]) => [destName(k), v] as [string, number])} total={shared.length} />
          <Bars title="Food needs" items={tally((p) => p.foodPreferences)} total={shared.length} />
          <dl className="grid grid-cols-2 gap-3 border-t border-line pt-4 text-sm">
            {(["adventureTolerance", "fitness", "nightlife", "freeVsPaid"] as const).map((k) => {
              const v = avg(k);
              return (
                <div key={k}>
                  <dt className="text-xs text-muted">{{ adventureTolerance: "Adventure", fitness: "Fitness", nightlife: "Nightlife", freeVsPaid: "Spending" }[k]}</dt>
                  <dd className="font-medium">{v ? `${LEVEL[k][Math.round(v)]} (${v.toFixed(1)})` : "-"}</dd>
                </div>
              );
            })}
          </dl>
        </div>
        <ul className="mt-4 space-y-2">
          {members.map((m) => (
            <li key={m.id} className="flex items-start gap-3 rounded-md border border-line bg-surface p-3">
              <Avatar name={m.name} color={m.color} size={30} muted={!m.joined} />
              <div className="min-w-0 flex-1 text-sm">
                <p className="font-medium">{m.name}</p>
                {m.prefs && m.prefs.interests.length ? (
                  <p className="text-xs text-muted">{m.prefs.interests.slice(0, 4).join(" · ")}{m.prefs.avoid ? ` · Avoid: ${m.prefs.avoid}` : ""}</p>
                ) : (
                  <p className="text-xs text-muted">No preferences yet</p>
                )}
              </div>
              {(m.id === myMemberId || (canProxy && !m.joined)) && (
                <button type="button" onClick={() => setEditing(m.id)} aria-label={`Edit preferences for ${m.name}`} className="text-muted hover:text-ink">
                  <Pencil className="size-4" />
                </button>
              )}
            </li>
          ))}
        </ul>
      </aside>
    </div>
  );
}

function Bars({ title, items, total }: { title: string; items: [string, number][]; total: number }) {
  if (!items.length) return null;
  return (
    <div>
      <p className="mb-2 text-sm font-semibold">{title}</p>
      <ul className="space-y-1.5">
        {items.slice(0, 6).map(([k, v]) => (
          <li key={k} className="text-sm">
            <div className="flex justify-between"><span>{k}</span><span className="text-muted tabular-nums">{v}</span></div>
            <div className="mt-0.5 h-1.5 rounded-full bg-surface-2"><div className="h-full rounded-full bg-brand-2" style={{ width: `${(v / Math.max(1, total)) * 100}%` }} /></div>
          </li>
        ))}
      </ul>
    </div>
  );
}

function Chips({ label, options, value, onChange }: { label: string; options: { value: string; label: string }[]; value: string[]; onChange: (v: string[]) => void }) {
  return (
    <fieldset>
      <legend className="mb-2 text-sm font-medium">{label}</legend>
      <div className="flex flex-wrap gap-1.5">
        {options.map((o) => {
          const on = value.includes(o.value);
          return (
            <button key={o.value} type="button" aria-pressed={on} onClick={() => onChange(on ? value.filter((x) => x !== o.value) : [...value, o.value])}
              className={cn("h-8 rounded-full border px-3 text-sm", on ? "border-brand bg-brand text-brand-ink" : "border-line bg-surface text-muted hover:text-ink")}>
              {o.label}
            </button>
          );
        })}
      </div>
    </fieldset>
  );
}

function Scale({ label, k, value, onChange }: { label: string; k: keyof typeof LEVEL; value: number; onChange: (v: number) => void }) {
  return (
    <div>
      <label htmlFor={`sc-${k}`} className="mb-1 flex justify-between text-sm font-medium">{label}<span className="font-normal text-muted">{LEVEL[k][value]}</span></label>
      <input id={`sc-${k}`} type="range" min={1} max={5} step={1} value={value} onChange={(e) => onChange(Number(e.target.value))} className="w-full accent-[var(--brand)]" aria-valuetext={LEVEL[k][value]} />
    </div>
  );
}

function PrefForm({ memberId, initial, destinations }: { memberId: string; initial: Prefs | null; destinations: { slug: string; name: string }[] }) {
  const toast = useToast();
  const [pending, start] = useTransition();
  const [p, setP] = useState<Prefs>(
    initial ?? { interests: [], preferredDestinations: [], adventureTolerance: 3, fitness: 3, foodPreferences: [], accommodation: "shared_property", nightlife: 3, budgetInr: null, freeVsPaid: 3, avoid: null },
  );
  return (
    <form
      className="space-y-6 rounded-md border border-line bg-surface p-5"
      onSubmit={(e) => {
        e.preventDefault();
        start(async () => {
          const r = await savePreferences(memberId, { ...p, accommodation: p.accommodation as "hotel", avoid: p.avoid || null });
          toast(r.ok ? { tone: "success", title: "Preferences saved" } : { tone: "error", title: r.error });
        });
      }}
    >
      <Chips label="Interests" options={INTERESTS.map((x) => ({ value: x, label: x }))} value={p.interests} onChange={(v) => setP({ ...p, interests: v })} />
      <Chips label="Destinations you'd love to include" options={destinations.map((d) => ({ value: d.slug, label: d.name }))} value={p.preferredDestinations} onChange={(v) => setP({ ...p, preferredDestinations: v })} />
      <div className="grid gap-5 sm:grid-cols-2">
        <Scale label="Adventure tolerance" k="adventureTolerance" value={p.adventureTolerance} onChange={(v) => setP({ ...p, adventureTolerance: v })} />
        <Scale label="Physical fitness" k="fitness" value={p.fitness} onChange={(v) => setP({ ...p, fitness: v })} />
        <Scale label="Nightlife" k="nightlife" value={p.nightlife} onChange={(v) => setP({ ...p, nightlife: v })} />
        <Scale label="Free vs paid" k="freeVsPaid" value={p.freeVsPaid} onChange={(v) => setP({ ...p, freeVsPaid: v })} />
      </div>
      <Chips label="Food preferences & needs" options={FOOD.map((x) => ({ value: x, label: x }))} value={p.foodPreferences} onChange={(v) => setP({ ...p, foodPreferences: v })} />
      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="Accommodation preference" name="accom">{(f) => <Select {...f} value={p.accommodation} onChange={(e) => setP({ ...p, accommodation: e.target.value })}>{ACCOM.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</Select>}</Field>
        <Field label="Personal budget (₹, excl. flights)" name="pbudget">{(f) => <Input {...f} type="number" min={0} step={1000} value={p.budgetInr ?? ""} onChange={(e) => setP({ ...p, budgetInr: e.target.value ? Number(e.target.value) : null })} />}</Field>
      </div>
      <Field label="Anything you'd rather avoid?" name="avoid" hint="e.g. heights, long boat trips, very early starts">{(f) => <Textarea {...f} rows={2} maxLength={500} value={p.avoid ?? ""} onChange={(e) => setP({ ...p, avoid: e.target.value })} />}</Field>
      <div className="flex items-center gap-3">
        <Button type="submit" disabled={pending}>{pending ? "Saving…" : "Save preferences"}</Button>
        {p.interests.length === 0 && <Badge tone="warn">Pick at least one interest to count in the group summary</Badge>}
      </div>
    </form>
  );
}
