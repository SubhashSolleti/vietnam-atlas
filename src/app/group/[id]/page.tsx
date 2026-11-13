import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { AlertTriangle, CalendarDays, Wallet } from "lucide-react";
import { eq } from "drizzle-orm";
import { db, t } from "@/db/client";
import { getCurrentUser } from "@/lib/auth";
import { cn, daysBetween, formatLongDate } from "@/lib/utils";
import { assertMember, consensusFor, tripBudget, tripWorkspace, TripAccessError } from "@/services/trips";
import { getCatalog } from "@/services/catalog";
import { Avatar } from "@/components/ui/avatar";
import { LiveRefresh } from "@/components/group/live-refresh";
import { MembersPanel } from "@/components/group/members-panel";
import { PreferencesPanel } from "@/components/group/preferences-panel";
import { ShortlistPanel } from "@/components/group/shortlist-panel";
import { ConsensusPanel } from "@/components/group/consensus-panel";
import { GroupBudgetPanel } from "@/components/group/group-budget-panel";
import { TripSwitcher } from "@/components/group/trip-switcher";
import { Money } from "@/components/catalog/price";

export async function generateMetadata({ searchParams }: { searchParams: Promise<{ tab?: string }> }): Promise<Metadata> {
  // Trip names are private, so the title names only the tab.
  const { tab = "overview" } = await searchParams;
  const label = TABS.find(([key]) => key === tab)?.[1] ?? "Overview";
  return { title: `${label} · Group workspace`, robots: { index: false } };
}

const TABS = [
  ["overview", "Overview"],
  ["members", "Members & invites"],
  ["preferences", "Preferences"],
  ["shortlist", "Shortlist & votes"],
  ["consensus", "Group decision"],
  ["budget", "Group budget"],
] as const;

export default async function GroupWorkspace({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ tab?: string }> }) {
  const { id } = await params;
  const { tab: rawTab = "overview" } = await searchParams;
  const tab = TABS.some(([key]) => key === rawTab) ? rawTab : "overview";
  const user = await getCurrentUser();
  if (!user) redirect("/group");
  let access;
  try {
    access = assertMember(id, user.id);
  } catch (e) {
    if (e instanceof TripAccessError) notFound();
    throw e;
  }
  const { trip, member } = access;
  const ws = tripWorkspace(trip.id);
  const canManage = member.role === "owner" || member.role === "editor";
  const { result: budget, fx } = tripBudget(trip);
  const remaining = budget.remainingPerMember ? Math.min(...Object.values(budget.remainingPerMember)) : null;
  const consensus = consensusFor(trip, ws, remaining);
  // Anonymous voting: individual votes never leave the server, only tallies, your own vote, and (for owners/editors)
  // the proxy votes they recorded for seats nobody has claimed yet.
  const anonymous = trip.votePrivacy === "anonymous";
  const unclaimed = new Set(ws.members.filter((m) => !m.userId).map((m) => m.id));
  const visibleVotes = (votes: { memberId: string; vote: string }[]) =>
    anonymous ? votes.filter((v) => v.memberId === member.id || (canManage && unclaimed.has(v.memberId))) : votes;
  const analysisFor = (id: string) => {
    const a = consensus.analyses.find((x) => x.id === id)!;
    return anonymous ? { ...a, likelyParticipants: [] } : a;
  };
  const days = daysBetween(trip.startDate, trip.endDate) + 1;
  const joined = ws.members.filter((m) => m.userId).length;
  const prefsDone = ws.preferences.filter((p) => p.interests.length > 0).length;
  const catalog = getCatalog();
  const allTrips = db.select({ id: t.trips.id, name: t.trips.name }).from(t.tripMembers).innerJoin(t.trips, eq(t.trips.id, t.tripMembers.tripId)).where(eq(t.tripMembers.userId, user.id)).all();

  return (
    <div className="container-x pt-8">
      <LiveRefresh tripId={trip.id} version={trip.updatedAt} />
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <p className="eyebrow">Group planner</p>
            {allTrips.length > 1 && <TripSwitcher trips={allTrips} activeId={trip.id} base="/group" />}
          </div>
          <h1 className="mt-1 text-4xl md:text-5xl">{trip.name}</h1>
          <p className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted">
            <span className="inline-flex items-center gap-1.5"><CalendarDays className="size-4" />{formatLongDate(trip.startDate)} – {formatLongDate(trip.endDate)} · {days} days</span>
            {trip.budgetTargetInr && <span className="inline-flex items-center gap-1.5"><Wallet className="size-4" />Target ₹{trip.budgetTargetInr.toLocaleString("en-IN")} per person</span>}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex -space-x-2">
            {ws.members.map((m) => (
              <span key={m.id} title={`${m.displayName}${m.userId ? "" : " (not joined yet)"}`}>
                <Avatar name={m.displayName} color={m.avatarColor} size={34} muted={!m.userId} />
              </span>
            ))}
          </div>
          <span className="text-sm text-muted">{joined}/{ws.members.length} joined</span>
        </div>
      </div>

      <nav aria-label="Workspace sections" className="sticky top-16 z-20 -mx-4 mt-6 border-b border-line bg-bg/95 px-4 backdrop-blur md:mx-0 md:px-0">
        <ul className="flex gap-1 relative overflow-x-auto scrollbar-none">
          {TABS.map(([key, label]) => (
            <li key={key}>
              <Link
                href={`/group/${trip.id}?tab=${key}`}
                scroll={false}
                aria-current={tab === key ? "page" : undefined}
                className={cn("block border-b-2 px-3 py-3 text-sm font-medium whitespace-nowrap", tab === key ? "border-accent text-ink" : "border-transparent text-muted hover:text-ink")}
              >
                {label}
                {key === "shortlist" && <span className="ml-1.5 text-xs tabular-nums opacity-70">{ws.candidates.length}</span>}
              </Link>
            </li>
          ))}
        </ul>
      </nav>

      <div className="pt-8">
        {tab === "overview" && (
          <div className="grid gap-6 lg:grid-cols-3">
            <OverviewCard title="Travellers joined" value={`${joined} of ${ws.members.length}`} href={`/group/${trip.id}?tab=members`} cta="Invite & manage" />
            <OverviewCard title="Preferences shared" value={`${prefsDone} of ${ws.members.length}`} href={`/group/${trip.id}?tab=preferences`} cta="Set your preferences" />
            <OverviewCard title="Shortlisted experiences" value={String(ws.candidates.length)} href={`/group/${trip.id}?tab=shortlist`} cta="Vote now" />
            <div className="rounded-md border border-line bg-surface p-5 lg:col-span-2">
              <h2 className="font-sans text-base font-semibold">Where the group stands</h2>
              <ul className="mt-3 grid gap-3 sm:grid-cols-3">
                <Stat label="Approved" value={ws.candidates.filter((c) => c.status === "approved" || c.status === "scheduled").length} />
                <Stat label="Suggested by votes" value={consensus.suggested.length} />
                <Stat label="Out of season" value={consensus.analyses.filter((a) => a.flags.seasonUnsuitable).length} tone="warn" />
              </ul>
              <div className="mt-5 flex flex-wrap gap-2 text-sm">
                <Link href="/trip" className="font-semibold text-accent hover:underline">Open itinerary →</Link>
                <Link href="/trip/budget" className="font-semibold text-accent hover:underline">Full budget →</Link>
                <Link href="/experiences" className="font-semibold text-accent hover:underline">Find more experiences →</Link>
              </div>
            </div>
            <div className="rounded-md border border-line bg-surface p-5">
              <h2 className="font-sans text-base font-semibold">Estimated spend per person</h2>
              <p className="mt-2 font-serif text-3xl"><Money vnd={budget.averagePerPersonVnd} /></p>
              <p className="mt-1 text-sm text-muted">Average across travellers · {budget.quotedTotalVnd ? "includes quotes" : "all estimates so far"}</p>
              {budget.targetPerPersonVnd != null && (
                <p className={cn("mt-3 text-sm font-medium", budget.overBudgetMemberIds.length ? "text-bad" : "text-good")}>
                  {budget.overBudgetMemberIds.length ? `${budget.overBudgetMemberIds.length} traveller(s) over target` : "Within the target budget"}
                </p>
              )}
            </div>
            {(
              <div className="flex gap-3 rounded-md border border-highlight/60 bg-highlight-soft p-5 lg:col-span-3">
                <AlertTriangle className="mt-0.5 size-5 shrink-0 text-warn" />
                <div className="text-sm">
                  <p className="font-semibold">Visa reminder for Indian passport holders</p>
                  <p className="mt-1">
                    Phu Quoc's visa exemption only covers stays on the island. Because this trip continues to the mainland and leaves from Hanoi, every traveller needs a Vietnam e-visa before departure. Apply only on the official portal.{" "}
                    <Link href="/guide/visa-and-immigration" className="font-semibold underline">Read the visa guide</Link>
                  </p>
                </div>
              </div>
            )}
          </div>
        )}
        {tab === "members" && (
          <MembersPanel
            tripId={trip.id}
            inviteCode={trip.inviteCode}
            myRole={member.role}
            votePrivacy={trip.votePrivacy}
            members={ws.members.map((m) => ({ id: m.id, displayName: m.displayName, avatarColor: m.avatarColor, role: m.role, travellerType: m.travellerType, coupleGroup: m.coupleGroup, joined: !!m.userId, isMe: m.id === member.id }))}
            trip={{ name: trip.name, startDate: trip.startDate, endDate: trip.endDate, budgetTargetInr: trip.budgetTargetInr, budgetMinInr: trip.budgetMinInr, budgetMaxInr: trip.budgetMaxInr, currency: trip.currency, description: trip.description }}
          />
        )}
        {tab === "preferences" && (
          <PreferencesPanel
            myMemberId={member.id}
            canProxy={canManage}
            destinations={catalog.destinations.filter((d) => !d.parentSlug).map((d) => ({ slug: d.slug, name: d.name }))}
            members={ws.members.map((m) => ({ id: m.id, name: m.displayName, color: m.avatarColor, joined: !!m.userId, prefs: ws.preferences.find((p) => p.memberId === m.id) ?? null }))}
          />
        )}
        {tab === "shortlist" && (
          <ShortlistPanel
            tripId={trip.id}
            myMemberId={member.id}
            canManage={canManage}
            votePrivacy={trip.votePrivacy}
            members={ws.members.map((m) => ({ id: m.id, name: m.displayName, color: m.avatarColor, joined: !!m.userId, travellerType: m.travellerType }))}
            candidates={ws.candidates.map((c) => ({
              id: c.id,
              status: c.status,
              participants: c.participants,
              agreedPriceVnd: c.agreedPriceVnd,
              priceIsQuote: c.priceIsQuote,
              perPersonVnd: c.perPersonVnd,
              addedBy: c.addedBy,
              card: c.card,
              votes: visibleVotes(c.votes).map((v) => ({ memberId: v.memberId, vote: v.vote })),
              comments: c.comments.map((x) => ({ id: x.id, memberId: x.memberId, body: x.body, createdAt: x.createdAt })),
              analysis: analysisFor(c.id),
            }))}
          />
        )}
        {tab === "consensus" && (
          <ConsensusPanel
            tripId={trip.id}
            canManage={canManage}
            items={ws.candidates.map((c) => ({ id: c.id, title: c.card?.title ?? "Activity", slug: c.card?.slug ?? "", destination: c.card?.destinationName ?? "", status: c.status, perPersonVnd: c.perPersonVnd, analysis: analysisFor(c.id) }))}
            suggestedIds={consensus.suggested.map((s) => s.id)}
            memberCount={ws.members.length}
          />
        )}
        {tab === "budget" && (
          <GroupBudgetPanel
            members={ws.members.map((m) => ({ id: m.id, name: m.displayName, color: m.avatarColor }))}
            budget={budget}
            inrToVnd={fx.inrToVnd}
            candidates={ws.candidates.filter((c) => c.status === "approved" || c.status === "scheduled").map((c) => ({ id: c.id, title: c.card?.title ?? "Activity", perPersonVnd: c.perPersonVnd, participants: c.participants, isQuote: c.priceIsQuote }))}
          />
        )}
      </div>
    </div>
  );
}

function OverviewCard({ title, value, href, cta }: { title: string; value: string; href: string; cta: string }) {
  return (
    <div className="rounded-md border border-line bg-surface p-5">
      <p className="text-sm text-muted">{title}</p>
      <p className="mt-1 font-serif text-4xl tabular-nums">{value}</p>
      <Link href={href} className="mt-3 inline-block text-sm font-semibold text-accent hover:underline">{cta} →</Link>
    </div>
  );
}

function Stat({ label, value, tone }: { label: string; value: number; tone?: "warn" }) {
  return (
    <li className="rounded-sm bg-surface-2 px-3 py-2.5">
      <p className="text-xs text-muted">{label}</p>
      <p className={cn("text-2xl font-semibold tabular-nums", tone === "warn" && value > 0 && "text-warn")}>{value}</p>
    </li>
  );
}
