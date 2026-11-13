"use client";

import { ArrowLeftRight } from "lucide-react";
import { useState } from "react";
import { useFx } from "@/components/site/fx";
import { formatInr, formatVnd } from "@/lib/money";
import { formatLongDate } from "@/lib/utils";

const NOTES = [10_000, 20_000, 50_000, 100_000, 200_000, 500_000];

export function FxConverter() {
  const fx = useFx();
  const [inr, setInr] = useState("1000");
  const [dir, setDir] = useState<"inr" | "vnd">("inr");
  const [vnd, setVnd] = useState("500000");
  return (
    <div className="rounded-md border border-line bg-surface p-5">
      <h2 className="font-sans text-base font-semibold">Currency converter</h2>
      <p className="mt-1 text-xs text-muted">
        1 INR = {fx.inrToVnd.toLocaleString()} VND · 1 USD = {fx.usdToVnd.toLocaleString()} VND. {fx.isLive ? "Live rate" : "Manual reference rate: not a live quote"}, updated {formatLongDate(fx.updatedAt)}.
      </p>
      <div className="mt-4 flex items-end gap-2">
        {dir === "inr" ? (
          <label className="flex-1 text-sm">
            <span className="mb-1 block font-medium">Rupees (₹)</span>
            <input type="number" min={0} className="field" value={inr} onChange={(e) => setInr(e.target.value)} />
          </label>
        ) : (
          <label className="flex-1 text-sm">
            <span className="mb-1 block font-medium">Dong (₫)</span>
            <input type="number" min={0} step={1000} className="field" value={vnd} onChange={(e) => setVnd(e.target.value)} />
          </label>
        )}
        <button type="button" onClick={() => setDir(dir === "inr" ? "vnd" : "inr")} aria-label="Swap direction" className="grid size-10 place-items-center rounded-md border border-line hover:border-ink">
          <ArrowLeftRight className="size-4" />
        </button>
        <div className="flex-1 text-sm">
          <span className="mb-1 block font-medium">{dir === "inr" ? "Dong (₫)" : "Rupees (₹)"}</span>
          <p className="field bg-surface-2 font-semibold tabular-nums" aria-live="polite">
            {dir === "inr" ? formatVnd(Number(inr || 0) * fx.inrToVnd) : formatInr(Number(vnd || 0) / fx.inrToVnd, { round: 1 })}
          </p>
        </div>
      </div>
      <p className="mt-4 mb-2 text-xs font-semibold text-muted">Common notes</p>
      <ul className="grid grid-cols-3 gap-1.5 text-xs sm:grid-cols-6">
        {NOTES.map((n) => (
          <li key={n} className="rounded-sm bg-surface-2 px-2 py-1.5 text-center tabular-nums">
            <span className="block font-semibold">{(n / 1000).toLocaleString()}k ₫</span>≈ {formatInr(n / fx.inrToVnd, { round: 1 })}
          </li>
        ))}
      </ul>
    </div>
  );
}
