"use client";

import { useState, useTransition } from "react";
import { saveBudgetCategory, saveFx } from "@/app/actions/admin";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/form";
import { useToast } from "@/components/ui/toast";
import type { FxRates } from "@/lib/money";
import { formatLongDate } from "@/lib/utils";

type Cat = { slug: string; name: string; description: string; budgetPerDay: number | null; balancedPerDay: number | null; comfortablePerDay: number | null };

export function SettingsAdmin({ fx, categories }: { fx: FxRates; categories: Cat[] }) {
  const toast = useToast();
  const [pending, start] = useTransition();
  const [v, setV] = useState({ inr: String(fx.inrToVnd), usd: String(fx.usdToVnd), source: fx.source });
  return (
    <div className="mt-6 space-y-10">
      <section className="rounded-md border border-line bg-surface p-5">
        <h2 className="text-2xl">Currency reference rates</h2>
        <p className="mt-1 text-sm text-muted">The local edition doesn't call a live FX API. Enter today's rate from your bank or a reference source; every INR figure on the site is converted with it and labelled with this timestamp. Last updated {formatLongDate(fx.updatedAt)}.</p>
        <form className="mt-4 grid gap-3 sm:grid-cols-3" onSubmit={(e) => { e.preventDefault(); start(async () => { const r = await saveFx({ inrToVnd: Number(v.inr), usdToVnd: Number(v.usd), source: v.source }); toast(r.ok ? { tone: "success", title: "Rates updated" } : { tone: "error", title: r.error }); }); }}>
          <Field label="VND per 1 INR" name="fx-inr">{(p) => <Input {...p} type="number" step="0.01" value={v.inr} onChange={(e) => setV({ ...v, inr: e.target.value })} />}</Field>
          <Field label="VND per 1 USD" name="fx-usd">{(p) => <Input {...p} type="number" value={v.usd} onChange={(e) => setV({ ...v, usd: e.target.value })} />}</Field>
          <Field label="Source note" name="fx-src">{(p) => <Input {...p} value={v.source} onChange={(e) => setV({ ...v, source: e.target.value })} />}</Field>
          <div><Button type="submit" disabled={pending}>Save rates</Button></div>
        </form>
      </section>
      <section>
        <h2 className="text-2xl">Budget baselines</h2>
        <p className="mt-1 text-sm text-muted">Illustrative per-person, per-day estimates in VND used before real quotes exist. Shown to travellers as estimates.</p>
        <ul className="mt-4 space-y-3">{categories.filter((c) => c.budgetPerDay != null).map((c) => <CatRow key={c.slug} c={c} />)}</ul>
      </section>
    </div>
  );
}

function CatRow({ c }: { c: Cat }) {
  const toast = useToast();
  const [pending, start] = useTransition();
  const [v, setV] = useState({ b: String(c.budgetPerDay ?? ""), m: String(c.balancedPerDay ?? ""), h: String(c.comfortablePerDay ?? ""), d: c.description });
  return (
    <li>
      <form className="grid items-end gap-3 rounded-md border border-line bg-surface p-4 sm:grid-cols-[1fr_repeat(3,8rem)_auto]" onSubmit={(e) => { e.preventDefault(); start(async () => { const r = await saveBudgetCategory(c.slug, { budgetPerDay: Number(v.b), balancedPerDay: Number(v.m), comfortablePerDay: Number(v.h), description: v.d }); toast(r.ok ? { tone: "success", title: `${c.name} saved` } : { tone: "error", title: r.error }); }); }}>
        <Field label={c.name} name={`d-${c.slug}`}>{(p) => <Input {...p} value={v.d} onChange={(e) => setV({ ...v, d: e.target.value })} />}</Field>
        <Field label="Budget ₫" name={`b-${c.slug}`}>{(p) => <Input {...p} type="number" value={v.b} onChange={(e) => setV({ ...v, b: e.target.value })} />}</Field>
        <Field label="Balanced ₫" name={`m-${c.slug}`}>{(p) => <Input {...p} type="number" value={v.m} onChange={(e) => setV({ ...v, m: e.target.value })} />}</Field>
        <Field label="Comfortable ₫" name={`h-${c.slug}`}>{(p) => <Input {...p} type="number" value={v.h} onChange={(e) => setV({ ...v, h: e.target.value })} />}</Field>
        <Button type="submit" variant="outline" disabled={pending}>Save</Button>
      </form>
    </li>
  );
}
