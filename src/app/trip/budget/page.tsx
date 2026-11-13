import type { Metadata } from "next";
import Link from "next/link";
import { getCurrentUser } from "@/lib/auth";
import { formatLongDate } from "@/lib/utils";
import { getCatalog } from "@/services/catalog";
import { resolveActiveTrip, tripBudget } from "@/services/trips";
import { EmptyState } from "@/components/ui/empty-state";
import { ButtonLink } from "@/components/ui/button";
import { LiveRefresh } from "@/components/group/live-refresh";
import { BudgetWorkspace } from "@/components/budget/budget-workspace";

export const metadata: Metadata = { title: "Budget calculator", robots: { index: false } };

export default async function BudgetPage() {
  const user = await getCurrentUser();
  const active = await resolveActiveTrip(user?.id);
  if (!active)
    return (
      <div className="container-x max-w-2xl pt-16">
        <EmptyState as="h1" title="Budgets live inside a trip" action={<ButtonLink href="/group">Create or join a trip</ButtonLink>}>
          Join or create a trip to calculate per-person and group budgets in INR and VND.
        </EmptyState>
      </div>
    );
  const { trip, member } = active;
  const { result, members, fx, categories, expenses } = await tripBudget(trip);
  const catalog = await getCatalog();
  const destName = Object.fromEntries(catalog.destinations.map((d) => [d.id, d.name]));
  return (
    <div className="container-x pt-8">
      <LiveRefresh tripId={trip.id} version={trip.updatedAt} />
      <p className="eyebrow">Budget calculator</p>
      <h1 className="mt-1 text-4xl md:text-5xl">{trip.name}</h1>
      <p className="mt-2 text-sm text-muted">
        {formatLongDate(trip.startDate)} – {formatLongDate(trip.endDate)} · {members.length} travellers · international flights {trip.settings.includeInternationalFlights ? "included" : "excluded (already booked)"} ·{" "}
        <Link href="/trip" className="text-accent hover:underline">Back to itinerary</Link>
      </p>
      <BudgetWorkspace
        tripId={trip.id}
        canManage={member.role !== "member"}
        scenario={trip.scenario}
        settings={trip.settings}
        targetInr={trip.budgetTargetInr}
        rangeInr={[trip.budgetMinInr, trip.budgetMaxInr]}
        result={result}
        fx={fx}
        members={members.map((m) => ({ id: m.id, name: m.displayName, color: m.avatarColor }))}
        categories={categories.map((c) => ({ slug: c.slug, name: c.name, description: c.description, perDay: c.budgetPerDay != null ? [c.budgetPerDay, c.balancedPerDay!, c.comfortablePerDay!] : null }))}
        expenses={expenses.map((e) => ({ id: e.id, categorySlug: e.categorySlug, label: e.label, amountVnd: e.amountVnd, costMode: e.costMode, participants: e.participants, destinationId: e.destinationId, date: e.date, isQuote: e.isQuote, notes: e.notes }))}
        destinations={catalog.destinations.map((d) => ({ id: d.id, name: d.name }))}
        destName={destName}
        startDate={trip.startDate}
        endDate={trip.endDate}
      />
    </div>
  );
}
