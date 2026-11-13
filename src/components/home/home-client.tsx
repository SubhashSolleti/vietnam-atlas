"use client";

import { ArrowRight, Search } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { MONTHS } from "@/content/taxonomy";
import { cn } from "@/lib/utils";

export function HeroParallax({ children }: { children: React.ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    let raf = 0;
    const onScroll = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        const y = Math.min(window.scrollY, 900);
        if (ref.current) ref.current.style.transform = `translate3d(0, ${y * 0.25}px, 0) scale(${1 + y / 6000})`;
      });
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);
  return (
    <div ref={ref} className="absolute inset-0 will-change-transform">
      {children}
    </div>
  );
}

export function HeroSearch() {
  const router = useRouter();
  const [q, setQ] = useState("");
  return (
    <form
      role="search"
      onSubmit={(e) => {
        e.preventDefault();
        router.push(q.trim() ? `/search?q=${encodeURIComponent(q.trim())}` : "/experiences");
      }}
      className="flex w-full max-w-xl items-center gap-2 rounded-full bg-white p-1.5 pl-5 text-charcoal shadow-[var(--shadow-pop)]"
    >
      <Search className="size-5 shrink-0 text-[#646a65]" aria-hidden />
      <label htmlFor="hero-q" className="sr-only">
        Search destinations and experiences
      </label>
      <input
        id="hero-q"
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="Try “Phu Quoc snorkelling” or “Sa Pa”"
        className="h-11 min-w-0 flex-1 bg-transparent text-[0.95rem] outline-none placeholder:text-[#7b817c]"
      />
      <button type="submit" className="flex h-11 items-center gap-2 rounded-full bg-[#173F35] px-5 text-sm font-semibold text-white hover:bg-[#10302a]">
        Search
      </button>
    </form>
  );
}

export interface SeasonDest {
  slug: string;
  name: string;
  region: string;
  months: string;
  image: string | null;
}

export function SeasonExplorer({ destinations, defaultMonth = 11 }: { destinations: SeasonDest[]; defaultMonth?: number }) {
  const [m, setM] = useState(defaultMonth);
  const score = (d: SeasonDest) => Number(d.months[m] ?? "0");
  const best = destinations.filter((d) => score(d) === 3);
  const good = destinations.filter((d) => score(d) === 2);
  const avoid = destinations.filter((d) => score(d) <= 1);
  return (
    <div>
      <div role="tablist" aria-label="Choose a month" className="-mx-4 flex gap-1 relative overflow-x-auto px-4 pb-2 scrollbar-none md:mx-0 md:px-0">
        {MONTHS.map((label, i) => (
          <button
            key={label}
            role="tab"
            aria-selected={m === i}
            type="button"
            onClick={() => setM(i)}
            className={cn(
              "h-9 min-w-12 shrink-0 rounded-full border px-3 text-sm font-medium transition-colors",
              m === i ? "border-brand bg-brand text-brand-ink" : "border-line bg-surface text-muted hover:text-ink",
            )}
          >
            {label}
            {i === 11 && <span className="sr-only"> (your trip)</span>}
          </button>
        ))}
      </div>
      <div role="tabpanel" className="mt-6 grid gap-6 lg:grid-cols-3">
        <SeasonColumn title="Excellent" tone="bg-brand" items={best} />
        <SeasonColumn title="Good" tone="bg-brand-2/60" items={good} />
        <SeasonColumn title="Challenging: check conditions" tone="bg-highlight/60" items={avoid} />
      </div>
      {m === 11 && (
        <p className="mt-6 rounded-md border border-line bg-surface px-4 py-3 text-sm text-muted">
          <strong className="text-ink">December in short:</strong> dry season in the south (Phu Quoc, Ho Chi Minh City, Mekong), cool and often misty in the north, cold in the far-north mountains, and the tail of the rainy and flood season on the central coast, where cave, river and sea activities may be suspended.
        </p>
      )}
    </div>
  );
}

function SeasonColumn({ title, tone, items }: { title: string; tone: string; items: SeasonDest[] }) {
  return (
    <div className="rounded-md border border-line bg-surface p-4">
      <h3 className="mb-3 flex items-center gap-2 font-sans text-sm font-semibold">
        <span className={cn("size-2.5 rounded-[2px]", tone)} />
        {title}
        <span className="text-muted tabular-nums">({items.length})</span>
      </h3>
      {items.length ? (
        <ul className="space-y-1">
          {items.map((d) => (
            <li key={d.slug}>
              <Link href={`/destinations/${d.slug}`} className="group flex items-center justify-between gap-2 rounded-sm px-2 py-1.5 text-sm hover:bg-surface-2">
                <span>
                  {d.name} <span className="text-xs text-muted">· {d.region}</span>
                </span>
                <ArrowRight className="size-3.5 opacity-0 transition-opacity group-hover:opacity-60" />
              </Link>
            </li>
          ))}
        </ul>
      ) : (
        <p className="px-2 text-sm text-muted">None this month.</p>
      )}
    </div>
  );
}
