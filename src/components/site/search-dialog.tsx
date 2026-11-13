"use client";

import { ArrowRight, BookOpen, Bus, Compass, Landmark, Loader2, MapPin, Mountain, Search, UtensilsCrossed, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useId, useRef, useState } from "react";
import { cn, optimizedImage } from "@/lib/utils";

type Hit = { kind: string; title: string; subtitle: string; href: string; image?: string | null };

const KIND_META: Record<string, { label: string; icon: typeof MapPin }> = {
  destination: { label: "Destinations", icon: MapPin },
  region: { label: "Regions", icon: Compass },
  attraction: { label: "Attractions", icon: Landmark },
  activity: { label: "Experiences", icon: Mountain },
  food: { label: "Food", icon: UtensilsCrossed },
  guide: { label: "Travel guide", icon: BookOpen },
  transport: { label: "Transport", icon: Bus },
};

const FILTERS = ["all", "destination", "activity", "attraction", "food", "guide", "transport"] as const;

const SUGGESTIONS = ["Phu Quoc", "Snorkelling", "Sa Pa trekking", "Street food", "Ha Long cruise", "E-visa", "Sleeper bus", "Free"];

export function SearchDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const ref = useRef<HTMLDialogElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [q, setQ] = useState("");
  const [kind, setKind] = useState<(typeof FILTERS)[number]>("all");
  const [hits, setHits] = useState<Hit[]>([]);
  const [state, setState] = useState<"idle" | "loading" | "error">("idle");
  const [active, setActive] = useState(0);
  const router = useRouter();
  const listId = useId();

  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) {
      d.showModal();
      setTimeout(() => inputRef.current?.focus(), 10);
    }
    if (!open && d.open) d.close();
  }, [open]);

  useEffect(() => {
    const d = ref.current;
    const onCancel = (e: Event) => {
      e.preventDefault();
      onClose();
    };
    d?.addEventListener("cancel", onCancel);
    return () => d?.removeEventListener("cancel", onCancel);
  }, [onClose]);

  useEffect(() => {
    if (!q.trim()) {
      setHits([]);
      setState("idle");
      return;
    }
    const ctrl = new AbortController();
    setState("loading");
    const id = setTimeout(async () => {
      try {
        const params = new URLSearchParams({ q, limit: "30" });
        if (kind !== "all") params.set("kinds", kind === "activity" ? "activity" : kind);
        const res = await fetch(`/api/search?${params}`, { signal: ctrl.signal });
        if (!res.ok) throw new Error();
        const data = (await res.json()) as { hits: Hit[] };
        setHits(data.hits);
        setActive(0);
        setState("idle");
      } catch (e) {
        if ((e as Error).name !== "AbortError") setState("error");
      }
    }, 140);
    return () => {
      clearTimeout(id);
      ctrl.abort();
    };
  }, [q, kind]);

  const go = useCallback(
    (href: string) => {
      onClose();
      router.push(href);
    },
    [onClose, router],
  );

  const grouped = hits.reduce<Record<string, Hit[]>>((acc, h) => {
    (acc[h.kind] ??= []).push(h);
    return acc;
  }, {});
  const flat = Object.values(grouped).flat();

  return (
    <dialog
      ref={ref}
      aria-label="Search Vietnam Atlas"
      onClick={(e) => e.target === ref.current && onClose()}
      className="mx-auto mt-[8vh] w-[calc(100%-1.5rem)] max-w-2xl rounded-lg bg-surface p-0 text-ink shadow-[var(--shadow-pop)]"
    >
      {open && (
        <div className="flex max-h-[78dvh] flex-col">
          <div className="flex items-center gap-3 border-b border-line px-4">
            <Search className="size-5 shrink-0 text-muted" aria-hidden />
            <input
              ref={inputRef}
              value={q}
              onChange={(e) => setQ(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "ArrowDown") {
                  e.preventDefault();
                  setActive((a) => Math.min(flat.length - 1, a + 1));
                } else if (e.key === "ArrowUp") {
                  e.preventDefault();
                  setActive((a) => Math.max(0, a - 1));
                } else if (e.key === "Enter") {
                  e.preventDefault();
                  if (flat[active]) go(flat[active].href);
                  else if (q.trim()) go(`/search?q=${encodeURIComponent(q.trim())}`);
                }
              }}
              placeholder="Search destinations, experiences, food, visas…"
              className="h-14 flex-1 bg-transparent text-base outline-none placeholder:text-muted"
              role="combobox"
              aria-expanded={flat.length > 0}
              aria-controls={listId}
              aria-activedescendant={flat[active] ? `${listId}-${active}` : undefined}
              aria-autocomplete="list"
            />
            {state === "loading" && <Loader2 className="size-4 animate-spin text-muted" aria-label="Searching" />}
            <button type="button" onClick={onClose} aria-label="Close search" className="grid size-8 place-items-center rounded-full text-muted hover:bg-surface-2">
              <X className="size-4" />
            </button>
          </div>
          <div className="relative flex shrink-0 gap-1.5 overflow-x-auto border-b border-line px-4 py-2 scrollbar-none" role="group" aria-label="Filter results">
            {FILTERS.map((f) => (
              <button
                key={f}
                type="button"
                aria-pressed={kind === f}
                onClick={() => setKind(f)}
                className={cn(
                  "h-7 shrink-0 rounded-full border px-3 text-xs font-medium",
                  kind === f ? "border-brand bg-brand text-brand-ink" : "border-line text-muted hover:text-ink",
                )}
              >
                {f === "all" ? "All" : KIND_META[f]?.label}
              </button>
            ))}
          </div>
          <div id={listId} role="listbox" className="flex-1 overflow-y-auto p-2">
            {!q.trim() && (
              <div className="p-3">
                <p className="eyebrow mb-3">Try searching for</p>
                <div className="flex flex-wrap gap-2">
                  {SUGGESTIONS.map((s) => (
                    <button key={s} type="button" onClick={() => setQ(s)} className="rounded-full border border-line px-3 py-1.5 text-sm hover:border-ink">
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            )}
            {state === "error" && <p className="p-4 text-sm text-bad">Search is unavailable right now. Please try again.</p>}
            {q.trim() && state !== "loading" && state !== "error" && !hits.length && (
              <div className="p-6 text-center text-sm text-muted">
                No results for “{q}”. Try a destination name like <button className="underline" onClick={() => setQ("Hanoi")}>Hanoi</button> or an activity like{" "}
                <button className="underline" onClick={() => setQ("kayaking")}>kayaking</button>.
              </div>
            )}
            {Object.entries(grouped).map(([k, list]) => {
              const meta = KIND_META[k] ?? KIND_META.activity!;
              return (
                <div key={k} className="mb-2">
                  <p className="px-3 pt-2 pb-1 text-[0.7rem] font-semibold tracking-wider text-muted uppercase">{meta.label}</p>
                  {list.map((h) => {
                    const idx = flat.indexOf(h);
                    const Icon = meta.icon;
                    return (
                      <button
                        key={h.href + h.title}
                        id={`${listId}-${idx}`}
                        role="option"
                        aria-selected={idx === active}
                        type="button"
                        onMouseEnter={() => setActive(idx)}
                        onClick={() => go(h.href)}
                        className={cn("flex w-full items-center gap-3 rounded-md px-3 py-2 text-left", idx === active && "bg-surface-2")}
                      >
                        {h.image ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={optimizedImage(h.image, 96)} alt="" className="size-10 shrink-0 rounded-sm object-cover" loading="lazy" />
                        ) : (
                          <span className="grid size-10 shrink-0 place-items-center rounded-sm bg-surface-2 text-muted">
                            <Icon className="size-4" />
                          </span>
                        )}
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-sm font-medium">{h.title}</span>
                          <span className="block truncate text-xs text-muted">{h.subtitle}</span>
                        </span>
                        {idx === active && <ArrowRight className="size-4 text-muted" />}
                      </button>
                    );
                  })}
                </div>
              );
            })}
            {q.trim() && hits.length > 0 && (
              <button type="button" onClick={() => go(`/search?q=${encodeURIComponent(q.trim())}`)} className="mt-1 w-full rounded-md px-3 py-2.5 text-left text-sm font-medium text-accent hover:bg-surface-2">
                See all results for “{q}” →
              </button>
            )}
          </div>
          <div className="hidden items-center gap-4 border-t border-line px-4 py-2 text-xs text-muted md:flex">
            <span>↑↓ to navigate</span>
            <span>↵ to open</span>
            <span>esc to close</span>
          </div>
        </div>
      )}
    </dialog>
  );
}
