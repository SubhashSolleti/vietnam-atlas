/** Money helpers. All stored amounts are integer VND; INR is derived from the reference rate. */

export interface FxRates {
  /** VND per 1 INR */
  inrToVnd: number;
  /** VND per 1 USD */
  usdToVnd: number;
  updatedAt: string;
  source: string;
  isLive: boolean;
}

export const DEFAULT_FX: FxRates = {
  inrToVnd: 300,
  usdToVnd: 26300,
  updatedAt: "2026-11-12T00:00:00.000Z",
  source: "Manual reference rate entered at setup, not a live quote. Update in Admin → Settings.",
  isLive: false,
};

export function vndToInr(vnd: number, fx: Pick<FxRates, "inrToVnd">) {
  return vnd / fx.inrToVnd;
}

export function inrToVnd(inr: number, fx: Pick<FxRates, "inrToVnd">) {
  return inr * fx.inrToVnd;
}

const vndFmt = new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 });
const inrFmt = new Intl.NumberFormat("en-IN", { maximumFractionDigits: 0 });

/** 1,250,000 ₫: compact optional: 1.25M ₫ */
export function formatVnd(vnd: number, opts: { compact?: boolean } = {}) {
  if (opts.compact) {
    const a = Math.abs(vnd);
    // Pick the unit after rounding, so 999,600 reads "1M", not "1000k".
    if (a >= 1_000_000 || Math.round(a / 1_000) >= 1_000) return `${trim(vnd / 1_000_000)}M ₫`;
    if (a >= 1_000) return `${trim(vnd / 1_000)}k ₫`;
  }
  return `${vndFmt.format(Math.round(vnd))} ₫`;
}

export function formatInr(inr: number, opts: { round?: number } = {}) {
  const r = opts.round ?? (Math.abs(inr) >= 1000 ? 10 : 1);
  const v = Math.round(Math.abs(inr) / r) * r;
  return `${inr < 0 && v > 0 ? "−" : ""}₹${inrFmt.format(v)}`;
}

function trim(n: number) {
  const s = n.toFixed(Math.abs(n) >= 10 ? 0 : 2);
  // Only strip zeros after a decimal point (1.50 → 1.5, 2.00 → 2), never from integers (40 stays 40).
  return s.includes(".") ? s.replace(/\.?0+$/, "") : s;
}

