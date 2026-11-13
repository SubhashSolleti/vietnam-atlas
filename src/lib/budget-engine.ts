/**
 * Budget engine: pure functions, no I/O.
 *
 * Key rule (spec §10.5): costs are allocated to the people who actually take part.
 *  - costMode "per_person": every participant pays `amountVnd`.
 *  - costMode "total":      `amountVnd` is split equally between participants.
 *  - participants null:     everyone on the trip.
 *  - participants []:       nobody (e.g. everyone who was going has left); the line costs nothing.
 */

export type Scenario = "budget" | "balanced" | "comfortable";
export type CostMode = "per_person" | "total";

export interface BudgetLine {
  id: string;
  source: "expense" | "activity" | "candidate" | "transport" | "accommodation" | "baseline" | "fixed";
  category: string;
  label: string;
  amountVnd: number;
  costMode: CostMode;
  participants: string[] | null;
  destinationId?: string | null;
  date?: string | null;
  /** An actual quotation/booking (vs an illustrative estimate). */
  isQuote: boolean;
}

export interface BaselineCategory {
  slug: string;
  name: string;
  /** [budget, balanced, comfortable] per person per day in VND, or null if not per-day. */
  perDay: [number, number, number] | null;
}

export interface BudgetInput {
  memberIds: string[];
  startDate: string;
  endDate: string;
  scenario: Scenario;
  baselines: BaselineCategory[];
  lines: BudgetLine[];
  /**
   * Nights already covered by explicit accommodation or overnight transport (YYYY-MM-DD of the night),
   * with who they cover (null = everyone). A stay booked for some travellers only covers those travellers.
   */
  coveredNights: { date: string; participants: string[] | null }[];
  /** Per-trip manual overrides of per-day baselines (VND per person per day); 0 disables a baseline. */
  baselineOverrides?: Record<string, number>;
  insurancePerPersonVnd?: number;
  simPerPersonVnd?: number;
  emergencyReservePct?: number;
  targetPerPersonVnd?: number | null;
}

export interface AllocatedLine extends BudgetLine {
  participantIds: string[];
  perParticipantVnd: number;
  groupTotalVnd: number;
  shared: boolean;
  optional: boolean;
}

export interface BudgetResult {
  lines: AllocatedLine[];
  groupTotalVnd: number;
  perMember: Record<string, number>;
  averagePerPersonVnd: number;
  maxPerPersonVnd: number;
  byCategory: { slug: string; totalVnd: number; estimatedVnd: number; quotedVnd: number }[];
  byDestination: Record<string, number>;
  byDay: Record<string, number>;
  sharedTotalVnd: number;
  individualTotalVnd: number;
  optionalTotalVnd: number;
  estimatedTotalVnd: number;
  quotedTotalVnd: number;
  emergencyReserveVnd: number;
  targetPerPersonVnd: number | null;
  remainingPerMember: Record<string, number> | null;
  overBudgetMemberIds: string[];
  days: number;
  nights: number;
}

const SCENARIO_INDEX: Record<Scenario, 0 | 1 | 2> = { budget: 0, balanced: 1, comfortable: 2 };

function datesBetween(start: string, end: string) {
  const out: string[] = [];
  const d = new Date(`${start}T00:00:00Z`);
  const e = new Date(`${end}T00:00:00Z`);
  while (d <= e) {
    out.push(d.toISOString().slice(0, 10));
    d.setUTCDate(d.getUTCDate() + 1);
  }
  return out;
}

export function allocate(line: BudgetLine, memberIds: string[]): AllocatedLine {
  const participantIds = line.participants === null ? memberIds : [...new Set(line.participants)].filter((p) => memberIds.includes(p));
  const n = participantIds.length;
  const perParticipantVnd = !n ? 0 : line.costMode === "per_person" ? line.amountVnd : line.amountVnd / n;
  const groupTotalVnd = !n ? 0 : line.costMode === "per_person" ? line.amountVnd * n : line.amountVnd;
  return {
    ...line,
    participantIds,
    perParticipantVnd,
    groupTotalVnd,
    shared: line.costMode === "total" && n > 1,
    optional: participantIds.length < memberIds.length,
  };
}

/** Build the illustrative baseline lines for per-day categories. */
export function baselineLines(input: BudgetInput): BudgetLine[] {
  const idx = SCENARIO_INDEX[input.scenario];
  const allDates = datesBetween(input.startDate, input.endDate);
  const nights = allDates.slice(0, -1); // last date is departure day
  const coveredFor = (night: string, member: string) =>
    input.coveredNights.some((c) => c.date === night && (c.participants === null || c.participants.includes(member)));
  const out: BudgetLine[] = [];
  for (const c of input.baselines) {
    if (!c.perDay) continue;
    const override = input.baselineOverrides?.[c.slug];
    const perDay = override ?? c.perDay[idx];
    if (!perDay) continue;
    if (c.slug === "accommodation") {
      // Each traveller is estimated only for the nights none of their own stays or overnight legs cover.
      const byCount = new Map<number, string[]>();
      for (const m of input.memberIds) {
        const uncovered = nights.filter((n) => !coveredFor(n, m)).length;
        if (uncovered) byCount.set(uncovered, [...(byCount.get(uncovered) ?? []), m]);
      }
      for (const [count, who] of byCount) {
        const everyone = who.length === input.memberIds.length;
        out.push({
          id: everyone ? `baseline:${c.slug}` : `baseline:${c.slug}:${count}`,
          source: "baseline",
          category: c.slug,
          label: `${c.name}estimate for ${count} unplanned night${count === 1 ? "" : "s"}`,
          amountVnd: perDay * count,
          costMode: "per_person",
          participants: everyone ? null : who,
          isQuote: false,
        });
      }
    } else {
      out.push({
        id: `baseline:${c.slug}`,
        source: "baseline",
        category: c.slug,
        label: `${c.name}estimate for ${allDates.length} days`,
        amountVnd: perDay * allDates.length,
        costMode: "per_person",
        participants: null,
        isQuote: false,
      });
    }
  }
  if (input.insurancePerPersonVnd)
    out.push({ id: "baseline:insurance", source: "baseline", category: "insurance", label: "Travel insurance: estimate", amountVnd: input.insurancePerPersonVnd, costMode: "per_person", participants: null, isQuote: false });
  if (input.simPerPersonVnd)
    out.push({ id: "baseline:sim", source: "baseline", category: "sim", label: "SIM / eSIM: estimate", amountVnd: input.simPerPersonVnd, costMode: "per_person", participants: null, isQuote: false });
  return out;
}

export function computeBudget(input: BudgetInput): BudgetResult {
  const { memberIds } = input;
  const explicitInsurance = input.lines.some((l) => l.category === "insurance");
  const explicitSim = input.lines.some((l) => l.category === "sim");
  const baseline = baselineLines({
    ...input,
    insurancePerPersonVnd: explicitInsurance ? 0 : input.insurancePerPersonVnd,
    simPerPersonVnd: explicitSim ? 0 : input.simPerPersonVnd,
  });
  const allocated = [...input.lines, ...baseline].map((l) => allocate(l, memberIds));

  const perMember: Record<string, number> = Object.fromEntries(memberIds.map((m) => [m, 0]));
  const byCat = new Map<string, { totalVnd: number; estimatedVnd: number; quotedVnd: number }>();
  const byDestination: Record<string, number> = {};
  const byDay: Record<string, number> = {};
  let shared = 0,
    individual = 0,
    optional = 0,
    estimated = 0,
    quoted = 0;

  for (const l of allocated) {
    for (const p of l.participantIds) perMember[p] = (perMember[p] ?? 0) + l.perParticipantVnd;
    const c = byCat.get(l.category) ?? { totalVnd: 0, estimatedVnd: 0, quotedVnd: 0 };
    c.totalVnd += l.groupTotalVnd;
    if (l.isQuote) c.quotedVnd += l.groupTotalVnd;
    else c.estimatedVnd += l.groupTotalVnd;
    byCat.set(l.category, c);
    if (l.destinationId) byDestination[l.destinationId] = (byDestination[l.destinationId] ?? 0) + l.groupTotalVnd;
    if (l.date) byDay[l.date] = (byDay[l.date] ?? 0) + l.groupTotalVnd;
    if (l.shared) shared += l.groupTotalVnd;
    else individual += l.groupTotalVnd;
    if (l.optional) optional += l.groupTotalVnd;
    if (l.isQuote) quoted += l.groupTotalVnd;
    else estimated += l.groupTotalVnd;
  }

  const subtotal = allocated.reduce((s, l) => s + l.groupTotalVnd, 0);
  const pct = input.emergencyReservePct ?? 0;
  const emergencyReserveVnd = Math.round((subtotal * pct) / 100);
  if (emergencyReserveVnd > 0) {
    // Reserve is proportional to each member's planned spend.
    for (const m of memberIds) perMember[m] = perMember[m]! * (1 + pct / 100);
    byCat.set("emergency_reserve", { totalVnd: emergencyReserveVnd, estimatedVnd: emergencyReserveVnd, quotedVnd: 0 });
    estimated += emergencyReserveVnd;
  }
  const groupTotalVnd = subtotal + emergencyReserveVnd;
  const values = Object.values(perMember);
  const target = input.targetPerPersonVnd ?? null;
  const remainingPerMember = target == null ? null : Object.fromEntries(memberIds.map((m) => [m, target - perMember[m]!]));
  const dates = datesBetween(input.startDate, input.endDate);

  return {
    lines: allocated,
    groupTotalVnd,
    perMember,
    averagePerPersonVnd: memberIds.length ? groupTotalVnd / memberIds.length : 0,
    maxPerPersonVnd: values.length ? Math.max(...values) : 0,
    byCategory: [...byCat.entries()].map(([slug, v]) => ({ slug, ...v })).sort((a, b) => b.totalVnd - a.totalVnd),
    byDestination,
    byDay,
    sharedTotalVnd: shared,
    individualTotalVnd: individual,
    optionalTotalVnd: optional,
    estimatedTotalVnd: estimated,
    quotedTotalVnd: quoted,
    emergencyReserveVnd,
    targetPerPersonVnd: target,
    remainingPerMember,
    overBudgetMemberIds: remainingPerMember ? memberIds.filter((m) => remainingPerMember[m]! < 0) : [],
    days: dates.length,
    nights: Math.max(0, dates.length - 1),
  };
}

/**
 * Several listed experiences can be one ticket (e.g. Golden Bridge is part of the Ba Na Hills ticket). Keep the
 * line covering the most travellers for each bundle and zero the rest, so the ticket is budgeted once.
 */
export function dedupeBundles(lines: BudgetLine[], bundleOf: (line: BudgetLine) => string | null | undefined, memberCount: number): BudgetLine[] {
  const reach = (l: BudgetLine) => (l.participants === null ? memberCount : new Set(l.participants).size);
  const keep = new Map<string, BudgetLine>();
  for (const l of lines) {
    const b = bundleOf(l);
    if (!b || !l.amountVnd) continue;
    const best = keep.get(b);
    if (!best || reach(l) > reach(best) || (reach(l) === reach(best) && l.amountVnd > best.amountVnd)) keep.set(b, l);
  }
  return lines.map((l) => {
    const b = bundleOf(l);
    if (!b || !l.amountVnd || keep.get(b) === l) return l;
    return { ...l, amountVnd: 0, label: `${l.label} (same ticket as “${keep.get(b)!.label}”)` };
  });
}

/**
 * Midpoint estimate for an activity price record → { amount, costMode }.
 * Per-boat / per-vehicle prices buy one unit per `unitCapacity` travellers (one unit when capacity is unknown);
 * per-group prices cover the whole party.
 */
export function activityCostFromPrice(price: { minVnd: number; maxVnd: number; unit: string; unitCapacity?: number | null } | null | undefined, partySize = 1) {
  if (!price) return { amountVnd: 0, costMode: "per_person" as CostMode, units: 0 };
  const mid = Math.round((price.minVnd + price.maxVnd) / 2 / 1000) * 1000;
  if (price.unit === "per_person") return { amountVnd: mid, costMode: "per_person" as CostMode, units: 1 };
  const units = price.unit !== "per_group" && price.unitCapacity ? Math.max(1, Math.ceil(Math.max(1, partySize) / price.unitCapacity)) : 1;
  return { amountVnd: mid * units, costMode: "total" as CostMode, units };
}
