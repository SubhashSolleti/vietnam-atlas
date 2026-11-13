"use client";

import { ChevronDown, Loader2, Search, SlidersHorizontal, X } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

export interface FilterGroup {
  key: string;
  label: string;
  type: "multi" | "single";
  options: { value: string; label: string; count?: number }[];
  collapsed?: boolean;
}

/** URL-driven filter state: every change updates the query string so results are shareable. */
function useFilterUrl() {
  const router = useRouter();
  const pathname = usePathname();
  const sp = useSearchParams();
  const [pending, start] = useTransition();
  const values = (k: string) => (sp.get(k) ?? "").split(",").filter(Boolean);
  const set = (k: string, vals: string[]) => {
    const next = new URLSearchParams(sp.toString());
    if (vals.length) next.set(k, vals.join(","));
    else next.delete(k);
    next.delete("page");
    // A history entry per filter change, so Back undoes the last one.
    start(() => router.push(`${pathname}?${next.toString()}`, { scroll: false }));
  };
  const clear = () => {
    const next = new URLSearchParams();
    const q = sp.get("q");
    if (q) next.set("q", q);
    start(() => router.push(`${pathname}${next.size ? `?${next}` : ""}`, { scroll: false }));
  };
  return { sp, values, set, clear, pending };
}

function Groups({ groups }: { groups: FilterGroup[] }) {
  const { values, set } = useFilterUrl();
  return (
    <div className="divide-y divide-line">
      {groups.map((g) => (
        <GroupBlock key={g.key} g={g} selected={values(g.key)} onChange={(v) => set(g.key, v)} />
      ))}
    </div>
  );
}

function GroupBlock({ g, selected: fromUrl, onChange: commit }: { g: FilterGroup; selected: string[]; onChange: (v: string[]) => void }) {
  // Optimistic local selection so checkboxes respond instantly while the URL/results update.
  const [selected, setSelected] = useState(fromUrl);
  const key = fromUrl.join(",");
  useEffect(() => setSelected(fromUrl), [key]); // eslint-disable-line react-hooks/exhaustive-deps
  const onChange = (v: string[]) => {
    setSelected(v);
    commit(v);
  };
  const [open, setOpen] = useState(!g.collapsed || selected.length > 0);
  const id = `fg-${g.key}`;
  return (
    <fieldset className="py-3">
      <legend className="w-full">
        <button type="button" aria-expanded={open} aria-controls={id} onClick={() => setOpen((o) => !o)} className="flex w-full items-center justify-between py-1 text-sm font-semibold">
          {g.label}
          {selected.length > 0 && <span className="ml-auto mr-2 rounded-full bg-brand px-1.5 text-[0.65rem] text-brand-ink tabular-nums">{selected.length}</span>}
          <ChevronDown className={cn("size-4 text-muted transition-transform", open && "rotate-180")} />
        </button>
      </legend>
      <div id={id} hidden={!open} className="mt-1.5 space-y-0.5">
        {g.options.map((o) => {
          const on = selected.includes(o.value);
          const disabled = o.count === 0 && !on;
          return (
            <label key={o.value} className={cn("flex cursor-pointer items-center gap-2.5 rounded-sm px-1 py-1 text-sm hover:bg-surface-2", disabled && "cursor-default opacity-45")}>
              <input
                type={g.type === "single" ? "radio" : "checkbox"}
                name={g.key}
                checked={on}
                disabled={disabled}
                onChange={() => onChange(g.type === "single" ? (on ? [] : [o.value]) : on ? selected.filter((x) => x !== o.value) : [...selected, o.value])}
                onClick={(e) => g.type === "single" && on && (e.preventDefault(), onChange([]))}
                className="size-4 accent-[var(--brand)]"
              />
              <span className="flex-1">{o.label}</span>
              {o.count != null && <span className="text-xs text-muted tabular-nums">{o.count}</span>}
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}

export function FilterSidebar({ groups, total }: { groups: FilterGroup[]; total: number }) {
  const { sp, clear, pending } = useFilterUrl();
  const active = groups.some((g) => sp.get(g.key));
  return (
    <aside aria-label="Filters" className="hidden lg:block">
      <div className="sticky top-24 max-h-[calc(100dvh-7rem)] overflow-y-auto pr-2">
        <div className="flex items-center justify-between pb-2">
          <p className="flex items-center gap-2 text-sm font-semibold">
            Filters {pending && <Loader2 className="size-3.5 animate-spin text-muted" />}
          </p>
          {active && (
            <button type="button" onClick={clear} className="text-xs font-medium text-accent hover:underline">
              Clear all
            </button>
          )}
        </div>
        <p className="sr-only" aria-live="polite">
          {total} results
        </p>
        <Groups groups={groups} />
      </div>
    </aside>
  );
}

export function MobileFilters({ groups, total }: { groups: FilterGroup[]; total: number }) {
  const [open, setOpen] = useState(false);
  const { sp, clear } = useFilterUrl();
  const count = groups.reduce((n, g) => n + (sp.get(g.key)?.split(",").filter(Boolean).length ?? 0), 0);
  return (
    <>
      <Button variant="outline" size="sm" className="lg:hidden" onClick={() => setOpen(true)}>
        <SlidersHorizontal className="size-4" /> Filters{count ? ` (${count})` : ""}
      </Button>
      <Dialog
        open={open}
        onClose={() => setOpen(false)}
        side="bottom"
        title="Filters"
        footer={
          <>
            <Button variant="ghost" onClick={clear}>
              Clear all
            </Button>
            <Button onClick={() => setOpen(false)}>Show {total} results</Button>
          </>
        }
      >
        <Groups groups={groups} />
      </Dialog>
    </>
  );
}

export function SearchWithin({ placeholder }: { placeholder: string }) {
  const { sp } = useFilterUrl();
  const router = useRouter();
  const pathname = usePathname();
  const [q, setQ] = useState(sp.get("q") ?? "");
  const [, start] = useTransition();
  // The value this box last wrote to the URL. The URL only overrides the input when something else changed it
  // (Back, "Clear filters"), never while the user is mid-word.
  const written = useRef(sp.get("q") ?? "");
  const urlQ = sp.get("q") ?? "";
  useEffect(() => {
    if (urlQ !== written.current) {
      written.current = urlQ;
      setQ(urlQ);
    }
  }, [urlQ]);
  useEffect(() => {
    const id = setTimeout(() => {
      const value = q.trim();
      if (value === written.current) return;
      written.current = value;
      const next = new URLSearchParams(sp.toString());
      if (value) next.set("q", value);
      else next.delete("q");
      next.delete("page");
      start(() => router.replace(`${pathname}?${next}`, { scroll: false }));
    }, 350);
    return () => clearTimeout(id);
  }, [q]); // eslint-disable-line react-hooks/exhaustive-deps
  return (
    <div className="relative flex-1">
      <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted" />
      <label htmlFor="within" className="sr-only">
        {placeholder}
      </label>
      <input id="within" type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder={placeholder} className="field h-10 pl-9" />
      {q && (
        <button type="button" onClick={() => setQ("")} aria-label="Clear search" className="absolute top-1/2 right-2 -translate-y-1/2 text-muted">
          <X className="size-4" />
        </button>
      )}
    </div>
  );
}

export function SortSelect({ options, param = "sort" }: { options: { value: string; label: string }[]; param?: string }) {
  const { sp } = useFilterUrl();
  const router = useRouter();
  const pathname = usePathname();
  const [, start] = useTransition();
  return (
    <label className="flex items-center gap-2 text-sm">
      <span className="hidden text-muted sm:inline">Sort</span>
      <select
        className="field h-10 w-auto"
        value={sp.get(param) ?? options[0]!.value}
        onChange={(e) => {
          const next = new URLSearchParams(sp.toString());
          next.set(param, e.target.value);
          next.delete("page");
          start(() => router.push(`${pathname}?${next}`, { scroll: false }));
        }}
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </label>
  );
}

export function ActiveChips({ groups }: { groups: FilterGroup[] }) {
  const { values, set } = useFilterUrl();
  // Only values the filters understand become chips (unknown URL values are ignored by the filtering too).
  const chips = groups.flatMap((g) => values(g.key).flatMap((v) => {
    const o = g.options.find((x) => x.value === v);
    return o ? [{ g, v, label: o.label }] : [];
  }));
  if (!chips.length) return null;
  return (
    <ul className="flex flex-wrap gap-1.5" aria-label="Active filters">
      {chips.map((c) => (
        <li key={`${c.g.key}:${c.v}`}>
          <button
            type="button"
            onClick={() => set(c.g.key, values(c.g.key).filter((x) => x !== c.v))}
            className="inline-flex h-7 items-center gap-1 rounded-full bg-surface-2 px-2.5 text-xs font-medium hover:bg-line"
            aria-label={`Remove filter ${c.label}`}
          >
            {c.label} <X className="size-3" />
          </button>
        </li>
      ))}
    </ul>
  );
}
