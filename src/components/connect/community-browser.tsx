"use client";

import { ExternalLink } from "lucide-react";
import { useState } from "react";
import { DataStatusBadge } from "@/components/catalog/meta";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

type Org = { id: string; name: string; type: string; city: string; description: string; organiser: string; url: string | null; howToEngage: string; cadence: string; price: string; status: string };
const CITY: Record<string, string> = { "": "All cities", hanoi: "Hanoi", "ho-chi-minh-city": "Ho Chi Minh City", "da-nang": "Da Nang", nationwide: "Nationwide" };
const TYPE: Record<string, string> = { developer_meetup: "Developer meetup", gdg: "GDG", cloud_group: "Cloud", ai_ml: "AI / ML", startup_community: "Startups", hackathon: "Hackathon", coworking: "Coworking", incubator: "Incubator / hub", conference: "Conference", founder_community: "Founders", engineering_community: "Engineering", university: "University" };

export function CommunityBrowser({ orgs }: { orgs: Org[] }) {
  const [city, setCity] = useState("");
  const [type, setType] = useState("");
  const types = [...new Set(orgs.map((o) => o.type))];
  const shown = orgs.filter((o) => (!city || o.city === city || o.city === "nationwide") && (!type || o.type === type));
  return (
    <div className="mt-5">
      <div className="flex flex-wrap gap-1.5">
        {Object.entries(CITY).map(([k, l]) => (
          <button key={k} type="button" aria-pressed={city === k} onClick={() => setCity(k)} className={cn("h-8 rounded-full border px-3 text-sm", city === k ? "border-brand bg-brand text-brand-ink" : "border-line text-muted hover:text-ink")}>{l}</button>
        ))}
        <select aria-label="Type" className="field ml-auto h-8 w-auto text-sm" value={type} onChange={(e) => setType(e.target.value)}>
          <option value="">All types</option>
          {types.map((t) => <option key={t} value={t}>{TYPE[t] ?? t}</option>)}
        </select>
      </div>
      <ul className="mt-5 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {shown.map((o) => (
          <li key={o.id} className="flex flex-col rounded-md border border-line bg-surface p-5">
            <div className="flex flex-wrap gap-1.5"><Badge>{TYPE[o.type] ?? o.type}</Badge><Badge tone="brand">{CITY[o.city] ?? o.city}</Badge></div>
            <h3 className="mt-2 font-sans text-base font-semibold">{o.name}</h3>
            <p className="text-xs text-muted">{o.organiser}</p>
            <p className="mt-2 text-sm">{o.description}</p>
            <dl className="mt-3 space-y-1.5 text-xs">
              <div><dt className="inline font-semibold">How to engage: </dt><dd className="inline text-muted">{o.howToEngage}</dd></div>
              <div><dt className="inline font-semibold">When: </dt><dd className="inline text-muted">{o.cadence}</dd></div>
              <div><dt className="inline font-semibold">Cost: </dt><dd className="inline text-muted">{o.price}</dd></div>
            </dl>
            <div className="mt-auto flex items-center justify-between pt-4">
              <DataStatusBadge status={o.status} />
              {o.url && <a href={o.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-sm font-semibold text-accent hover:underline">Website <ExternalLink className="size-3.5" /></a>}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
