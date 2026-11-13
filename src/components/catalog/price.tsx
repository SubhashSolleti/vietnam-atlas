"use client";

import { useFx } from "@/components/site/fx";
import { formatInr, formatVnd, vndToInr } from "@/lib/money";
import { cn } from "@/lib/utils";

const UNIT: Record<string, string> = { per_person: "per person", per_group: "per group", per_boat: "per boat", per_vehicle: "per vehicle" };

/** Price display in INR (primary for the demo group) with VND alongside. */
export function Price({
  tier,
  price,
  size = "md",
  showStatus = true,
  className,
}: {
  tier: "free" | "low" | "paid";
  price: { minVnd: number; maxVnd: number; unit: string; status: string } | null;
  size?: "sm" | "md" | "lg";
  showStatus?: boolean;
  className?: string;
}) {
  const fx = useFx();
  if (tier === "free" || !price || price.maxVnd === 0) {
    return (
      <span className={cn("font-semibold text-good", size === "lg" ? "text-2xl" : size === "md" ? "text-base" : "text-sm", className)}>
        Free
      </span>
    );
  }
  const same = price.minVnd === price.maxVnd;
  const inr = same ? formatInr(vndToInr(price.minVnd, fx)) : `${formatInr(vndToInr(price.minVnd, fx))}–${formatInr(vndToInr(price.maxVnd, fx)).slice(1)}`;
  const vnd = same ? formatVnd(price.minVnd, { compact: true }) : `${formatVnd(price.minVnd, { compact: true }).replace(" ₫", "")}–${formatVnd(price.maxVnd, { compact: true })}`;
  const estimate = !price.status.startsWith("verified");
  return (
    <span className={cn("inline-flex flex-col leading-tight", className)}>
      <span className={cn("font-semibold tabular-nums", size === "lg" ? "text-2xl" : size === "md" ? "text-base" : "text-sm")}>
        {!same && <span className="mr-1 text-[0.7em] font-normal text-muted">from</span>}
        {inr}
      </span>
      <span className="text-xs text-muted tabular-nums">
        {vnd} · {UNIT[price.unit] ?? price.unit}
        {showStatus && estimate && <span className="ml-1 text-warn">· estimate</span>}
      </span>
    </span>
  );
}

export function Money({ vnd, className, showVnd = true }: { vnd: number; className?: string; showVnd?: boolean }) {
  const fx = useFx();
  return (
    <span className={cn("tabular-nums", className)}>
      {formatInr(vndToInr(vnd, fx))}
      {showVnd && <span className="ml-1.5 text-[0.8em] font-normal text-muted">{formatVnd(vnd, { compact: true })}</span>}
    </span>
  );
}
