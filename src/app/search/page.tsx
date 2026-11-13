import type { Metadata } from "next";
import Link from "next/link";
import { BookOpen, Bus, Compass, Landmark, MapPin, Mountain, UtensilsCrossed } from "lucide-react";
import { EmptyState } from "@/components/ui/empty-state";
import { SearchWithin } from "@/components/catalog/filter-panel";
import { search, type SearchKind } from "@/services/catalog";
import { cn, optimizedImage } from "@/lib/utils";

export const metadata: Metadata = { title: "Search", robots: { index: false } };

const KINDS: { kind: SearchKind | "all"; label: string; icon: typeof MapPin }[] = [
  { kind: "all", label: "All", icon: Compass },
  { kind: "destination", label: "Destinations", icon: MapPin },
  { kind: "region", label: "Regions", icon: Compass },
  { kind: "attraction", label: "Attractions", icon: Landmark },
  { kind: "activity", label: "Experiences", icon: Mountain },
  { kind: "food", label: "Food", icon: UtensilsCrossed },
  { kind: "guide", label: "Travel info", icon: BookOpen },
  { kind: "transport", label: "Transport", icon: Bus },
];

export default async function SearchPage({ searchParams }: { searchParams: Promise<{ q?: string; kind?: string }> }) {
  const { q = "", kind: rawKind = "all" } = await searchParams;
  const kind = KINDS.some((k) => k.kind === rawKind) ? rawKind : "all";
  const all = q.trim() ? await search(q, { limit: 400 }) : [];
  const hits = kind === "all" ? all : all.filter((h) => h.kind === kind);
  return (
    <div className="container-x max-w-4xl pt-10">
      <h1 className="text-4xl">Search</h1>
      <div className="mt-5 flex"><SearchWithin placeholder="Search destinations, experiences, dishes, visas…" /></div>
      <nav aria-label="Result types" className="mt-4 flex flex-wrap gap-1.5">
        {KINDS.map((k) => {
          const n = k.kind === "all" ? all.length : all.filter((h) => h.kind === k.kind).length;
          return (
            <Link key={k.kind} href={`/search?q=${encodeURIComponent(q)}${k.kind === "all" ? "" : `&kind=${k.kind}`}`} aria-current={kind === k.kind ? "page" : undefined}
              className={cn("inline-flex h-8 items-center gap-1.5 rounded-full border px-3 text-sm", kind === k.kind ? "border-brand bg-brand text-brand-ink" : "border-line text-muted hover:text-ink", !n && kind !== k.kind && "opacity-50")}>
              {k.label} <span className="text-xs tabular-nums opacity-70">{n}</span>
            </Link>
          );
        })}
      </nav>
      {!q.trim() ? (
        <p className="mt-10 text-muted">Type to search across destinations, attractions, experiences, local dishes and the travel guide.</p>
      ) : hits.length ? (
        <ul className="mt-6 divide-y divide-line rounded-md border border-line bg-surface">
          {hits.map((h) => {
            const Icon = KINDS.find((k) => k.kind === h.kind)?.icon ?? Compass;
            return (
              <li key={h.href + h.title}>
                <Link href={h.href} className="flex items-center gap-4 px-4 py-3 hover:bg-surface-2">
                  {h.image ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={optimizedImage(h.image, 96)} alt="" className="size-12 shrink-0 rounded-sm object-cover" loading="lazy" />
                  ) : (
                    <span className="grid size-12 shrink-0 place-items-center rounded-sm bg-surface-2 text-muted"><Icon className="size-5" /></span>
                  )}
                  <span className="min-w-0"><span className="block font-medium">{h.title}</span><span className="block truncate text-sm text-muted">{h.subtitle}</span></span>
                </Link>
              </li>
            );
          })}
        </ul>
      ) : (
        <EmptyState className="mt-8" title={`No results for “${q}”`}>Check the spelling, try fewer words, or search a destination name such as Hanoi, Hoi An or Phu Quoc.</EmptyState>
      )}
    </div>
  );
}
