import { CalendarCheck2, CalendarX2, ShieldCheck, TriangleAlert } from "lucide-react";
import { Badge, type Tone } from "@/components/ui/badge";
import { DATA_STATUS_LABELS, DECEMBER_LABELS, MONTHS, MONTH_SCORE_LABELS } from "@/content/taxonomy";
import { cn } from "@/lib/utils";

export function DataStatusBadge({ status, className }: { status: string; className?: string }) {
  const s = DATA_STATUS_LABELS[status] ?? { label: status, tone: "neutral" as const };
  return (
    <Badge tone={s.tone as Tone} className={className} icon={s.tone === "good" ? <ShieldCheck className="size-3" /> : undefined}>
      {s.label}
    </Badge>
  );
}

export function DecemberBadge({ status, className }: { status: string; className?: string }) {
  const d = DECEMBER_LABELS[status as keyof typeof DECEMBER_LABELS] ?? DECEMBER_LABELS.unknown;
  const Icon = d.tone === "good" ? CalendarCheck2 : d.tone === "bad" ? CalendarX2 : TriangleAlert;
  return (
    <Badge tone={d.tone as Tone} className={className} icon={<Icon className="size-3" />}>
      {d.label}
    </Badge>
  );
}

/** Adventure intensity 1–5 as a compact meter. */
export function IntensityMeter({ value, className }: { value: number; className?: string }) {
  const label = ["", "Gentle", "Light", "Moderate", "Demanding", "Extreme"][value] ?? "";
  return (
    <span className={cn("inline-flex items-center gap-1.5", className)} title={`Adventure intensity ${value}/5: ${label}`}>
      <span className="flex gap-0.5" aria-hidden>
        {[1, 2, 3, 4, 5].map((i) => (
          <span key={i} className={cn("h-2.5 w-1.5 rounded-[1px]", i <= value ? (value >= 4 ? "bg-accent" : "bg-brand-2") : "bg-line")} />
        ))}
      </span>
      <span className="text-xs text-muted">
        <span className="sr-only">Adventure intensity: </span>
        {label}
      </span>
    </span>
  );
}

const SCORE_BG = ["bg-bad/70", "bg-highlight/55", "bg-brand-2/60", "bg-brand"];

/** 12-month suitability strip; highlights the given months (e.g. trip months). */
export function MonthStrip({ months, highlight = [11], compact, className }: { months: string; highlight?: number[]; compact?: boolean; className?: string }) {
  const scores = months.split("").map(Number);
  return (
    <div className={cn("w-full", className)}>
      <ol className="grid grid-cols-12 gap-0.5" aria-label="Month-by-month suitability">
        {scores.map((s, i) => (
          <li key={i} className="flex flex-col items-center gap-1">
            <span
              className={cn("w-full rounded-[2px]", compact ? "h-1.5" : "h-6", SCORE_BG[s] ?? "bg-line", highlight.includes(i) && "ring-2 ring-accent ring-offset-1 ring-offset-surface")}
              title={`${MONTHS[i]}: ${MONTH_SCORE_LABELS[s] ?? "Unknown"}`}
            />
            {!compact && <span className={cn("text-[0.62rem] text-muted", highlight.includes(i) && "font-bold text-accent")}>{MONTHS[i]![0]}</span>}
            <span className="sr-only">
              {MONTHS[i]}: {MONTH_SCORE_LABELS[s]}
            </span>
          </li>
        ))}
      </ol>
      {!compact && (
        <div className="mt-2 flex flex-wrap gap-3 text-[0.68rem] text-muted" aria-hidden>
          {MONTH_SCORE_LABELS.map((l, i) => (
            <span key={l} className="inline-flex items-center gap-1">
              <span className={cn("size-2 rounded-[1px]", SCORE_BG[i])} />
              {l}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

export function bestMonths(months: string) {
  const s = months.split("").map(Number);
  const max = Math.max(...s);
  const best = s.map((v, i) => (v === max ? i : -1)).filter((i) => i >= 0);
  if (best.length === 12) return "Year-round";
  // collapse into ranges
  const ranges: string[] = [];
  let start = best[0]!;
  for (let k = 1; k <= best.length; k++) {
    if (best[k] !== best[k - 1]! + 1) {
      const end = best[k - 1]!;
      ranges.push(start === end ? MONTHS[start]! : `${MONTHS[start]}–${MONTHS[end]}`);
      start = best[k]!;
    }
  }
  return ranges.join(", ");
}
