"use client";

import { Pencil, Plus, Trash2 } from "lucide-react";
import { useState, useTransition } from "react";
import { deleteExpense, saveExpense, updateBudgetSettings } from "@/app/actions/itinerary";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useConfirm } from "@/components/ui/confirm";
import { Dialog } from "@/components/ui/dialog";
import { Field, Input, Select, Textarea } from "@/components/ui/form";
import { Segmented } from "@/components/ui/segmented";
import { useToast } from "@/components/ui/toast";
import type { TripSettings } from "@/db/schema";
import type { BudgetResult } from "@/lib/budget-engine";
import { formatInr, formatVnd, vndToInr, type FxRates } from "@/lib/money";
import { cn, formatDay, formatLongDate } from "@/lib/utils";

type Expense = { id: string; categorySlug: string; label: string; amountVnd: number; costMode: "per_person" | "total"; participants: string[] | null; destinationId: string | null; date: string | null; isQuote: boolean; notes: string | null };
type Cat = { slug: string; name: string; description: string; perDay: [number, number, number] | null };

export function BudgetWorkspace(p: {
  tripId: string;
  canManage: boolean;
  scenario: "budget" | "balanced" | "comfortable";
  settings: TripSettings;
  targetInr: number | null;
  rangeInr: [number | null, number | null];
  result: BudgetResult;
  fx: FxRates;
  members: { id: string; name: string; color: string }[];
  categories: Cat[];
  expenses: Expense[];
  destinations: { id: string; name: string }[];
  destName: Record<string, string>;
  startDate: string;
  endDate: string;
}) {
  const { result: r, fx } = p;
  const toast = useToast();
  const confirm = useConfirm();
  const [pending, start] = useTransition();
  const [expense, setExpense] = useState<Expense | "new" | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const inr = (vnd: number) => formatInr(vndToInr(vnd, fx));
  const both = (vnd: number) => (
    <span className="tabular-nums">
      {inr(vnd)} <span className="text-xs text-muted">{formatVnd(vnd, { compact: true })}</span>
    </span>
  );
  const catName = (slug: string) => p.categories.find((c) => c.slug === slug)?.name ?? slug.replace(/_/g, " ");
  const save = (fn: () => Promise<{ ok: boolean; error?: string }>, ok: string) =>
    start(async () => {
      const res = await fn();
      toast(res.ok ? { tone: "success", title: ok } : { tone: "error", title: (res as { error: string }).error });
    });
  const target = r.targetPerPersonVnd;
  const used = target ? Math.min(100, (r.maxPerPersonVnd / target) * 100) : 0;
  const maxDay = Math.max(1, ...Object.values(r.byDay));
  const byDest = Object.entries(r.byDestination).sort((a, b) => b[1] - a[1]);
  const maxDest = Math.max(1, ...byDest.map((x) => x[1]));

  return (
    <div className="mt-6 space-y-10">
      <div className="flex flex-col gap-3 rounded-md border border-line bg-surface p-4 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-sm font-semibold">Spending scenario</p>
          <p className="text-xs text-muted">Changes the illustrative daily estimates for food, local transport, shopping and unplanned nights.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Segmented
            label="Spending scenario"
            value={p.scenario}
            onChange={(v) => (p.canManage ? save(() => updateBudgetSettings(p.tripId, { scenario: v }), `Scenario: ${v}`) : toast({ tone: "error", title: "Only the owner or an editor can change the scenario." }))}
            options={[
              { value: "budget", label: "Budget" },
              { value: "balanced", label: "Balanced" },
              { value: "comfortable", label: "Comfortable" },
            ]}
          />
          {p.canManage && <Button size="sm" variant="outline" onClick={() => setSettingsOpen(true)}>Adjust estimates</Button>}
        </div>
      </div>

      {/* KPIs */}
      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4" aria-label="Budget summary">
        <Kpi label="Per person (average)" value={both(r.averagePerPersonVnd)} sub={target ? `Target ${inr(target)}${p.rangeInr[0] && p.rangeInr[1] ? ` · range ₹${p.rangeInr[0].toLocaleString("en-IN")}–₹${p.rangeInr[1].toLocaleString("en-IN")}` : ""}` : "No target set"} />
        <Kpi label="Group total" value={both(r.groupTotalVnd)} sub={`${p.members.length} travellers · ${r.days} days`} />
        <Kpi
          label="Remaining (tightest traveller)"
          value={r.remainingPerMember ? <span className={cn(Math.min(...Object.values(r.remainingPerMember)) < 0 && "text-bad")}>{both(Math.min(...Object.values(r.remainingPerMember)))}</span> : "-"}
          sub={r.targetPerPersonVnd == null ? "No target set" : r.overBudgetMemberIds.length ? `${r.overBudgetMemberIds.length} over target` : "Everyone within target"}
        />
        <Kpi label="Cost per day (group)" value={both(r.groupTotalVnd / Math.max(1, r.days))} sub={`≈ ${inr(r.averagePerPersonVnd / Math.max(1, r.days))} per person per day`} />
      </section>
      {target != null && (
        <div>
          <div className="flex justify-between text-xs text-muted"><span>Highest per-person plan vs target</span><span>{Math.round((r.maxPerPersonVnd / target) * 100)}%</span></div>
          <div className="mt-1 h-3 overflow-hidden rounded-full bg-surface-2"><div className={cn("h-full", r.maxPerPersonVnd > target ? "bg-bad" : "bg-brand-2")} style={{ width: `${used}%` }} /></div>
        </div>
      )}
      <div className="grid gap-4 sm:grid-cols-3">
        <Kpi label="Quotations & bookings" value={both(r.quotedTotalVnd)} sub="Actual quotes / booked items" />
        <Kpi label="Illustrative estimates" value={both(r.estimatedTotalVnd)} sub="Planning figures: not verified prices" />
        <Kpi label="Emergency reserve" value={both(r.emergencyReserveVnd)} sub={`${p.settings.emergencyReservePct ?? 0}% of the plan`} />
      </div>

      {/* Categories */}
      <section aria-labelledby="cat-h">
        <h2 id="cat-h" className="mb-4 text-2xl">By category</h2>
        <div className="relative overflow-x-auto rounded-md border border-line bg-surface" tabIndex={0} role="region" aria-labelledby="cat-h">
          <table className="w-full min-w-[640px] text-sm">
            <thead className="bg-surface-2 text-left text-xs text-muted">
              <tr><th className="px-4 py-2 font-semibold">Category</th><th className="px-4 py-2 font-semibold">Group (INR)</th><th className="px-4 py-2 font-semibold">Group (VND)</th><th className="px-4 py-2 font-semibold">Per person (avg)</th><th className="px-4 py-2 font-semibold">Basis</th></tr>
            </thead>
            <tbody className="divide-y divide-line">
              {r.byCategory.map((c) => (
                <tr key={c.slug}>
                  <td className="px-4 py-2.5 font-medium">{catName(c.slug)}</td>
                  <td className="px-4 py-2.5 tabular-nums">{inr(c.totalVnd)}</td>
                  <td className="px-4 py-2.5 text-muted tabular-nums">{formatVnd(c.totalVnd)}</td>
                  <td className="px-4 py-2.5 tabular-nums">{inr(c.totalVnd / Math.max(1, p.members.length))}</td>
                  <td className="px-4 py-2.5">{c.quotedVnd > 0 && c.estimatedVnd > 0 ? <Badge tone="neutral">Mixed</Badge> : c.quotedVnd > 0 ? <Badge tone="good">Quoted</Badge> : <Badge tone="warn">Estimate</Badge>}</td>
                </tr>
              ))}
              <tr className="bg-surface-2 font-semibold"><td className="px-4 py-2.5">Total</td><td className="px-4 py-2.5 tabular-nums">{inr(r.groupTotalVnd)}</td><td className="px-4 py-2.5 tabular-nums">{formatVnd(r.groupTotalVnd)}</td><td className="px-4 py-2.5 tabular-nums">{inr(r.averagePerPersonVnd)}</td><td /></tr>
            </tbody>
          </table>
        </div>
        {!p.settings.includeInternationalFlights && <p className="mt-2 text-xs text-muted">International flights are already booked and excluded. Change this under “Adjust estimates”.</p>}
      </section>

      <div className="grid gap-8 lg:grid-cols-2">
        {/* Per member */}
        <section aria-labelledby="pp-h">
          <h2 id="pp-h" className="mb-4 text-2xl">Per traveller</h2>
          <ul className="divide-y divide-line rounded-md border border-line bg-surface">
            {p.members.map((m) => {
              const total = r.perMember[m.id] ?? 0;
              const left = r.remainingPerMember?.[m.id];
              const optional = r.lines.filter((l) => l.optional && l.participantIds.includes(m.id));
              return (
                <li key={m.id} className="flex items-center gap-3 px-4 py-3">
                  <Avatar name={m.name} color={m.color} size={30} />
                  <div className="min-w-0 flex-1">
                    <p className="font-medium">{m.name}</p>
                    <p className="text-xs text-muted">{optional.length} optional item{optional.length === 1 ? "" : "s"}</p>
                  </div>
                  <div className="text-right text-sm">
                    <p className="font-semibold">{both(total)}</p>
                    {left != null && <p className={cn("text-xs", left < 0 ? "text-bad" : "text-good")}>{left < 0 ? "Over by" : "Left"} {inr(Math.abs(left))}</p>}
                  </div>
                </li>
              );
            })}
          </ul>
          <p className="mt-2 text-xs text-muted">Optional activities are charged only to participants, so totals differ between travellers.</p>
        </section>

        {/* By destination & day */}
        <section aria-labelledby="dest-h">
          <h2 id="dest-h" className="mb-4 text-2xl">By destination</h2>
          {byDest.length ? (
            <ul className="space-y-2 rounded-md border border-line bg-surface p-4">
              {byDest.map(([id, v]) => (
                <li key={id} className="text-sm">
                  <div className="flex justify-between"><span>{p.destName[id] ?? "Other"}</span><span className="tabular-nums">{inr(v)}</span></div>
                  <div className="mt-1 h-1.5 rounded-full bg-surface-2"><div className="h-full rounded-full bg-brand-2" style={{ width: `${(v / maxDest) * 100}%` }} /></div>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-muted">Costs appear here once activities, stays and transport are linked to destinations.</p>
          )}
          <h2 className="mt-8 mb-4 text-2xl">By day</h2>
          <div className="flex h-40 items-end gap-1 rounded-md border border-line bg-surface p-3" role="img" aria-label="Planned cost per day">
            {Object.keys(r.byDay).length === 0 && <p className="m-auto text-sm text-muted">No dated costs yet.</p>}
            {Object.entries(r.byDay)
              .sort()
              .map(([d, v]) => (
                <div key={d} className="group relative flex h-full flex-1 flex-col justify-end">
                  <div className="rounded-t-[2px] bg-jade" style={{ height: `${(v / maxDay) * 100}%` }} title={`${formatDay(d)}: ${inr(v)}`} />
                  <span className="mt-1 text-center text-[0.6rem] text-muted">{Number(d.slice(8))}</span>
                </div>
              ))}
          </div>
          <p className="mt-2 text-xs text-muted">Dated items only (activities, transport, check-ins, dated expenses). Daily estimates are spread across the whole trip.</p>
        </section>
      </div>

      {/* Expenses */}
      <section aria-labelledby="exp-h">
        <div className="mb-4 flex items-end justify-between">
          <div>
            <h2 id="exp-h" className="text-2xl">Expenses & manual adjustments</h2>
            <p className="text-sm text-muted">Record quotations, actual spending, insurance, SIMs or anything not in the itinerary.</p>
          </div>
          <Button onClick={() => setExpense("new")}><Plus className="size-4" />Add expense</Button>
        </div>
        {p.expenses.length ? (
          <ul className="divide-y divide-line rounded-md border border-line bg-surface">
            {p.expenses.map((e) => (
              <li key={e.id} className="flex flex-wrap items-center gap-3 px-4 py-3 text-sm">
                <div className="min-w-0 flex-1">
                  <p className="font-medium">{e.label}</p>
                  <p className="text-xs text-muted">{catName(e.categorySlug)}{e.date ? ` · ${formatDay(e.date)}` : ""}{e.destinationId ? ` · ${p.destName[e.destinationId]}` : ""} · {e.participants ? `${e.participants.length} of ${p.members.length}` : "everyone"}</p>
                </div>
                <Badge tone={e.isQuote ? "good" : "warn"}>{e.isQuote ? "Quote / actual" : "Estimate"}</Badge>
                <span className="w-40 text-right">{both(e.amountVnd)} <span className="text-xs text-muted">{e.costMode === "total" ? "total" : "pp"}</span></span>
                <Button size="sm" variant="ghost" aria-label={`Edit ${e.label}`} onClick={() => setExpense(e)}><Pencil className="size-4" /></Button>
                <Button size="sm" variant="ghost" aria-label={`Delete ${e.label}`} className="text-bad" onClick={async () => (await confirm({ title: `Delete “${e.label}”?`, confirmLabel: "Delete", tone: "danger" })) && save(() => deleteExpense(e.id), "Expense deleted")}><Trash2 className="size-4" /></Button>
              </li>
            ))}
          </ul>
        ) : (
          <p className="rounded-md border border-dashed border-line-strong px-4 py-6 text-center text-sm text-muted">No expenses recorded yet.</p>
        )}
      </section>

      {/* All lines */}
      <details className="rounded-md border border-line bg-surface">
        <summary className="cursor-pointer px-4 py-3 text-sm font-semibold">Every line in this budget ({r.lines.length})</summary>
        <ul className="divide-y divide-line text-sm">
          {r.lines.map((l) => (
            <li key={l.id} className="flex flex-wrap items-center gap-3 px-4 py-2">
              <span className="min-w-0 flex-1">{l.label} <span className="text-xs text-muted">· {catName(l.category)} · {l.participantIds.length === p.members.length ? "everyone" : `${l.participantIds.length} people`}</span></span>
              <Badge tone={l.isQuote ? "good" : "warn"}>{l.isQuote ? "Quote" : "Estimate"}</Badge>
              <span className="w-36 text-right tabular-nums">{inr(l.groupTotalVnd)}</span>
              <span className="w-32 text-right text-xs text-muted tabular-nums">{inr(l.perParticipantVnd)} each</span>
            </li>
          ))}
        </ul>
      </details>
      <p className="text-xs text-muted">
        Currency: 1 INR = {fx.inrToVnd.toLocaleString()} VND · 1 USD = {fx.usdToVnd.toLocaleString()} VND · {fx.isLive ? "live rate" : "manual reference rate"} updated {formatLongDate(fx.updatedAt)}. {fx.source}
      </p>

      {expense && (
        <ExpenseDialog tripId={p.tripId} expense={expense === "new" ? null : expense} categories={p.categories} members={p.members} destinations={p.destinations} fx={fx} startDate={p.startDate} endDate={p.endDate} onClose={() => setExpense(null)} />
      )}
      {settingsOpen && <SettingsDialog tripId={p.tripId} settings={p.settings} targetInr={p.targetInr} categories={p.categories} scenario={p.scenario} fx={fx} onClose={() => setSettingsOpen(false)} />}
      {pending && <span className="sr-only" aria-live="polite">Saving…</span>}
    </div>
  );
}

function Kpi({ label, value, sub }: { label: string; value: React.ReactNode; sub?: string }) {
  return (
    <div className="rounded-md border border-line bg-surface p-5">
      <p className="text-sm text-muted">{label}</p>
      <p className="mt-1 text-xl font-semibold">{value}</p>
      {sub && <p className="mt-1 text-xs text-muted">{sub}</p>}
    </div>
  );
}

function ExpenseDialog({ tripId, expense, categories, members, destinations, fx, startDate, endDate, onClose }: { tripId: string; expense: Expense | null; categories: Cat[]; members: { id: string; name: string }[]; destinations: { id: string; name: string }[]; fx: FxRates; startDate: string; endDate: string; onClose: () => void }) {
  const toast = useToast();
  const [pending, start] = useTransition();
  const [v, setV] = useState({
    categorySlug: expense?.categorySlug ?? "paid_activities",
    label: expense?.label ?? "",
    inr: expense ? String(Math.round(vndToInr(expense.amountVnd, fx))) : "",
    costMode: expense?.costMode ?? "per_person",
    participants: expense?.participants ?? null,
    destinationId: expense?.destinationId ?? "",
    date: expense?.date ?? "",
    isQuote: expense?.isQuote ?? false,
    notes: expense?.notes ?? "",
  });
  const [err, setErr] = useState<Record<string, string>>({});
  const ids = v.participants ?? members.map((m) => m.id);
  const amountVnd = Math.round(Number(v.inr || 0) * fx.inrToVnd);
  return (
    <Dialog open onClose={onClose} title={expense ? "Edit expense" : "Add expense"} size="md"
      footer={<><Button variant="ghost" onClick={onClose}>Cancel</Button><Button disabled={pending} onClick={() => start(async () => {
        const r = await saveExpense(tripId, expense?.id ?? null, { categorySlug: v.categorySlug, label: v.label, amountVnd, costMode: v.costMode, participants: v.participants, destinationId: v.destinationId || null, date: v.date || null, isQuote: v.isQuote, notes: v.notes || null });
        if (!r.ok) { setErr(r.fieldErrors ?? {}); toast({ tone: "error", title: r.error }); return; }
        toast({ tone: "success", title: "Expense saved" }); onClose();
      })}>Save</Button></>}>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="sm:col-span-2"><Field label="Description" name="x-label" error={err.label}>{(f) => <Input {...f} value={v.label} onChange={(e) => setV({ ...v, label: e.target.value })} placeholder="e.g. Hanoi→Sa Pa cabin bus quote" />}</Field></div>
        <Field label="Category" name="x-cat">{(f) => <Select {...f} value={v.categorySlug} onChange={(e) => setV({ ...v, categorySlug: e.target.value })}>{categories.map((c) => <option key={c.slug} value={c.slug}>{c.name}</option>)}</Select>}</Field>
        <Field label="Amount (₹)" name="x-amt" error={err.amountVnd} hint={v.inr ? `= ${formatVnd(amountVnd)}` : undefined}>{(f) => <Input {...f} type="number" min={0} value={v.inr} onChange={(e) => setV({ ...v, inr: e.target.value })} />}</Field>
        <Field label="Amount is" name="x-mode">{(f) => <Select {...f} value={v.costMode} onChange={(e) => setV({ ...v, costMode: e.target.value as "total" })}><option value="per_person">Per person</option><option value="total">Total, split between participants</option></Select>}</Field>
        <Field label="Date" name="x-date">{(f) => <Input {...f} type="date" min={startDate} max={endDate} value={v.date} onChange={(e) => setV({ ...v, date: e.target.value })} />}</Field>
        <Field label="Destination" name="x-dest">{(f) => <Select {...f} value={v.destinationId} onChange={(e) => setV({ ...v, destinationId: e.target.value })}><option value=""></option>{destinations.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}</Select>}</Field>
        <label className="flex items-center gap-2 self-end pb-2 text-sm"><input type="checkbox" className="size-4 accent-[var(--brand)]" checked={v.isQuote} onChange={(e) => setV({ ...v, isQuote: e.target.checked })} />Actual quote / amount paid</label>
        <fieldset className="sm:col-span-2">
          <legend className="mb-1.5 text-sm font-medium">Participants ({ids.length}/{members.length})</legend>
          <div className="grid grid-cols-2 gap-1 sm:grid-cols-4">
            {members.map((m) => (
              <label key={m.id} className="flex items-center gap-2 text-sm"><input type="checkbox" className="size-4 accent-[var(--brand)]" checked={ids.includes(m.id)} onChange={() => { const next = ids.includes(m.id) ? ids.filter((x) => x !== m.id) : [...ids, m.id]; if (next.length) setV({ ...v, participants: next.length === members.length ? null : next }); }} />{m.name}</label>
            ))}
          </div>
        </fieldset>
        <div className="sm:col-span-2"><Field label="Notes" name="x-notes">{(f) => <Textarea {...f} rows={2} value={v.notes} onChange={(e) => setV({ ...v, notes: e.target.value })} />}</Field></div>
      </div>
    </Dialog>
  );
}

function SettingsDialog({ tripId, settings, targetInr, categories, scenario, fx, onClose }: { tripId: string; settings: TripSettings; targetInr: number | null; categories: Cat[]; scenario: "budget" | "balanced" | "comfortable"; fx: FxRates; onClose: () => void }) {
  const toast = useToast();
  const [pending, start] = useTransition();
  const idx = { budget: 0, balanced: 1, comfortable: 2 }[scenario];
  const overrides = settings.baselines?.overrides ?? {};
  const toInr = (vnd: number) => String(Math.round(vndToInr(vnd, fx)));
  const [initial] = useState(() => ({
    target: targetInr ? String(targetInr) : "",
    insurance: toInr(settings.insurancePerPersonVnd ?? 0),
    sim: toInr(settings.simPerPersonVnd ?? 0),
    per: Object.fromEntries(categories.filter((c) => c.perDay).map((c) => [c.slug, overrides[c.slug] != null ? toInr(overrides[c.slug]!) : ""])) as Record<string, string>,
  }));
  const [v, setV] = useState({
    target: targetInr ? String(targetInr) : "",
    insurance: toInr(settings.insurancePerPersonVnd ?? 0),
    sim: toInr(settings.simPerPersonVnd ?? 0),
    reserve: String(settings.emergencyReservePct ?? 0),
    intl: !!settings.includeInternationalFlights,
    per: Object.fromEntries(categories.filter((c) => c.perDay).map((c) => [c.slug, overrides[c.slug] != null ? toInr(overrides[c.slug]!) : ""])) as Record<string, string>,
  });
  const vnd = (inr: string) => Math.round(Number(inr || 0) * fx.inrToVnd);
  return (
    <Dialog open onClose={onClose} title="Adjust estimates" description="Manual adjustments replace the illustrative defaults for this trip only." size="lg"
      footer={<><Button variant="ghost" onClick={onClose}>Cancel</Button><Button disabled={pending} onClick={() => start(async () => {
        // Only send what was edited: INR↔VND round-tripping would otherwise drift stored VND amounts.
        const r = await updateBudgetSettings(tripId, {
          ...(v.target !== initial.target ? { budgetTargetInr: v.target ? Number(v.target) : null } : {}),
          ...(v.insurance !== initial.insurance ? { insurancePerPersonVnd: vnd(v.insurance) } : {}),
          ...(v.sim !== initial.sim ? { simPerPersonVnd: vnd(v.sim) } : {}),
          emergencyReservePct: Number(v.reserve || 0),
          includeInternationalFlights: v.intl,
          overrides: Object.fromEntries(Object.entries(v.per).filter(([k, x]) => x !== initial.per[k]).map(([k, x]) => [k, x === "" ? null : vnd(x)])),
        });
        toast(r.ok ? { tone: "success", title: "Budget settings saved" } : { tone: "error", title: r.error });
        if (r.ok) onClose();
      })}>Save</Button></>}>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Target budget per person (₹)" name="b-target">{(f) => <Input {...f} type="number" min={0} step={1000} value={v.target} onChange={(e) => setV({ ...v, target: e.target.value })} />}</Field>
        <Field label="Emergency reserve (%)" name="b-res">{(f) => <Input {...f} type="number" min={0} max={50} value={v.reserve} onChange={(e) => setV({ ...v, reserve: e.target.value })} />}</Field>
        <Field label="Travel insurance per person (₹)" name="b-ins" hint="Estimate unless you enter a quote as an expense">{(f) => <Input {...f} type="number" min={0} value={v.insurance} onChange={(e) => setV({ ...v, insurance: e.target.value })} />}</Field>
        <Field label="SIM / eSIM per person (₹)" name="b-sim">{(f) => <Input {...f} type="number" min={0} value={v.sim} onChange={(e) => setV({ ...v, sim: e.target.value })} />}</Field>
        <label className="flex items-center gap-2 text-sm sm:col-span-2"><input type="checkbox" className="size-4 accent-[var(--brand)]" checked={v.intl} onChange={(e) => setV({ ...v, intl: e.target.checked })} />Include international flights in the budget (needs their cost entered on the flight legs)</label>
        <div className="sm:col-span-2">
          <p className="mb-2 text-sm font-semibold">Daily estimates per person (₹)</p>
          <p className="mb-2 text-xs text-muted">Defaults shown are for the {scenario} scenario. A value you enter replaces the default in every scenario.</p>
          <div className="grid gap-3 sm:grid-cols-2">
            {categories.filter((c) => c.perDay).map((c) => (
              <Field key={c.slug} label={c.name} name={`b-${c.slug}`} hint={`Default ${formatInr(vndToInr(c.perDay![idx], fx))}/day · blank = default · 0 = exclude`}>
                {(f) => <Input {...f} type="number" min={0} value={v.per[c.slug] ?? ""} onChange={(e) => setV({ ...v, per: { ...v.per, [c.slug]: e.target.value } })} />}
              </Field>
            ))}
          </div>
        </div>
      </div>
    </Dialog>
  );
}
