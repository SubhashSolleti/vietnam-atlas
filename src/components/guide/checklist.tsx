"use client";

import { Check } from "lucide-react";
import { useOptimistic, useTransition } from "react";
import { toggleChecklistItem } from "@/app/actions/account";
import { useToast } from "@/components/ui/toast";
import { cn } from "@/lib/utils";

type Item = { id: string; group: string; label: string; detail: string | null; dueDaysBefore: number | null };

const GROUP_LABELS: Record<string, string> = {
  documents: "Documents", money: "Money", health: "Health & insurance", connectivity: "Connectivity", bookings: "Bookings",
  packing_clothing: "Clothing", packing_rain: "Rain protection", packing_cold: "Winter clothes (Sa Pa & the north)", packing_footwear: "Footwear",
  packing_swim: "Swimming", packing_electronics: "Electronics", packing_medicine: "Medicines & personal essentials",
};

export function Checklist({ items, done, departure }: { items: Item[]; done: string[]; departure?: string }) {
  const toast = useToast();
  const [, start] = useTransition();
  const [opt, setOpt] = useOptimistic(done, (s: string[], a: { id: string; on: boolean }) => (a.on ? [...s, a.id] : s.filter((x) => x !== a.id)));
  const groups = [...new Set(items.map((i) => i.group))];
  const pct = items.length ? Math.round((items.filter((i) => opt.includes(i.id)).length / items.length) * 100) : 0;
  const due = (d: number | null) => {
    if (d == null || !departure) return null;
    const x = new Date(`${departure}T00:00:00Z`);
    x.setUTCDate(x.getUTCDate() - d);
    return x.toLocaleDateString("en-GB", { day: "numeric", month: "short", timeZone: "UTC" });
  };
  return (
    <div>
      <div className="mb-5 rounded-md border border-line bg-surface p-4">
        <div className="flex justify-between text-sm"><span className="font-semibold">Progress</span><span className="tabular-nums">{pct}%</span></div>
        <div className="mt-2 h-2.5 rounded-full bg-surface-2"><div className="h-full rounded-full bg-brand-2 transition-[width]" style={{ width: `${pct}%` }} /></div>
        <p className="mt-2 text-xs text-muted">Saved to your account or guest profile on this device.</p>
      </div>
      <div className="grid gap-5 md:grid-cols-2">
        {groups.map((g) => (
          <fieldset key={g} className="rounded-md border border-line bg-surface p-4">
            <legend className="px-1 text-sm font-semibold">{GROUP_LABELS[g] ?? g}</legend>
            <ul className="space-y-1">
              {items.filter((i) => i.group === g).map((i) => {
                const on = opt.includes(i.id);
                return (
                  <li key={i.id}>
                    <label className="flex cursor-pointer items-start gap-3 rounded-sm px-1.5 py-1.5 hover:bg-surface-2">
                      <input type="checkbox" className="peer sr-only" checked={on} onChange={() => start(async () => { setOpt({ id: i.id, on: !on }); const r = await toggleChecklistItem(i.id, !on); if (!r.ok) toast({ tone: "error", title: r.error }); })} />
                      <span className={cn("mt-0.5 grid size-5 shrink-0 place-items-center rounded-xs border peer-focus-visible:ring-2 peer-focus-visible:ring-accent", on ? "border-brand bg-brand text-brand-ink" : "border-line-strong")}>{on && <Check className="size-3.5" />}</span>
                      <span className="text-sm">
                        <span className={cn(on && "text-muted line-through")}>{i.label}</span>
                        {i.detail && <span className="block text-xs text-muted">{i.detail}</span>}
                        {due(i.dueDaysBefore) && <span className="block text-xs text-accent">Do by {due(i.dueDaysBefore)}</span>}
                      </span>
                    </label>
                  </li>
                );
              })}
            </ul>
          </fieldset>
        ))}
      </div>
    </div>
  );
}
