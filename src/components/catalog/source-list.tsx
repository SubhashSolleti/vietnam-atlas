import { ExternalLink } from "lucide-react";
import { formatLongDate } from "@/lib/utils";
import { DataStatusBadge } from "./meta";

export interface SourceItem {
  id: string;
  title: string;
  url: string;
  publisher: string;
  kind: string;
  checked: string;
  status: string;
  confidence: string;
  verifiedAt: string;
}

const KIND: Record<string, string> = {
  official_tourism: "Official tourism",
  government: "Government",
  attraction_official: "Official attraction",
  national_park: "National park",
  transport: "Transport operator",
  provider: "Activity provider",
  publisher: "Publisher",
  reference: "Reference",
};

export function SourceList({ sources, title = "Sources & verification" }: { sources: SourceItem[]; title?: string }) {
  if (!sources.length)
    return <p className="text-sm text-muted">No sources have been recorded for this item yet. Treat all details as unverified.</p>;
  const last = sources.map((s) => s.verifiedAt).sort().at(-1)!;
  const order = ["official_tourism", "government", "national_park", "attraction_official", "transport", "provider", "publisher", "reference"];
  const sorted = [...sources].sort((a, b) => order.indexOf(a.kind) - order.indexOf(b.kind));
  return (
    <div>
      <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
        <h3 className="font-sans text-sm font-semibold">{title}</h3>
        <p className="text-xs text-muted">Sources compiled {formatLongDate(last)}</p>
      </div>
      <ul className="divide-y divide-line rounded-md border border-line bg-surface">
        {sorted.map((s) => (
          <li key={s.id} className="flex flex-col gap-1.5 px-4 py-3 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0">
              <a href={s.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-sm font-medium hover:text-accent hover:underline">
                {s.title}
                <ExternalLink className="size-3 shrink-0 opacity-60" aria-hidden />
                <span className="sr-only">(opens in a new tab)</span>
              </a>
              <p className="text-xs text-muted">
                {KIND[s.kind] ?? s.kind} · {s.publisher} · Used for: {s.checked}
              </p>
            </div>
            <div className="flex shrink-0 items-center gap-1.5">
              <DataStatusBadge status={s.status} />
              <span className="text-[0.68rem] text-muted capitalize">{s.confidence} confidence</span>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
