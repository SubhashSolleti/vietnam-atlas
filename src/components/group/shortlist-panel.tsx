"use client";

import { ChevronDown, MessageSquare, Settings2, Trash2 } from "lucide-react";
import Link from "next/link";
import { useMemo, useState, useTransition } from "react";
import { addComment, castVote, deleteComment, removeCandidate, setCandidateParticipation, setCandidateStatus } from "@/app/actions/trips";
import { AtlasImage } from "@/components/catalog/atlas-image";
import { DecemberBadge } from "@/components/catalog/meta";
import { Money } from "@/components/catalog/price";
import { useFx } from "@/components/site/fx";
import { Avatar } from "@/components/ui/avatar";
import { Badge, type Tone } from "@/components/ui/badge";
import { Button, ButtonLink } from "@/components/ui/button";
import { useConfirm } from "@/components/ui/confirm";
import { EmptyState } from "@/components/ui/empty-state";
import { useToast } from "@/components/ui/toast";
import { VOTE_LABELS } from "@/content/taxonomy";
import type { ActivityCardData } from "@/lib/activity-filters";
import type { CandidateAnalysis } from "@/lib/consensus";
import { cn } from "@/lib/utils";

type Vote = keyof typeof VOTE_LABELS;
type Member = { id: string; name: string; color: string; joined: boolean; travellerType: string };
type Candidate = {
  id: string;
  status: string;
  participants: string[] | null;
  agreedPriceVnd: number | null;
  priceIsQuote: boolean;
  perPersonVnd: number;
  addedBy: string | null;
  card: ActivityCardData | null;
  votes: { memberId: string; vote: string }[];
  comments: { id: string; memberId: string; body: string; createdAt: string }[];
  analysis: CandidateAnalysis;
};

const VOTE_ORDER: Vote[] = ["must_do", "interested", "neutral", "not_interested", "cannot"];
const VOTE_COLOR: Record<Vote, string> = { must_do: "bg-brand", interested: "bg-brand-2/70", neutral: "bg-line-strong", not_interested: "bg-highlight", cannot: "bg-bad/70" };
const STATUS: Record<string, { label: string; tone: Tone }> = {
  discussion: { label: "In discussion", tone: "neutral" },
  approved: { label: "Group approved", tone: "good" },
  rejected: { label: "Not selected", tone: "bad" },
  scheduled: { label: "In itinerary", tone: "brand" },
  completed: { label: "Completed", tone: "accent" },
};

export function ShortlistPanel({ tripId, myMemberId, canManage, votePrivacy, members, candidates }: { tripId: string; myMemberId: string; canManage: boolean; votePrivacy: "named" | "anonymous"; members: Member[]; candidates: Candidate[] }) {
  const [filter, setFilter] = useState<"all" | "unvoted" | "discussion" | "approved" | "rejected">("all");
  const [sort, setSort] = useState<"score" | "recent" | "price">("score");
  const items = useMemo(() => {
    const list = candidates.filter((c) =>
      filter === "all" ? true : filter === "unvoted" ? !c.votes.some((v) => v.memberId === myMemberId) : filter === "approved" ? c.status === "approved" || c.status === "scheduled" : c.status === filter,
    );
    return [...list].sort((a, b) => (sort === "score" ? b.analysis.score - a.analysis.score : sort === "price" ? a.perPersonVnd - b.perPersonVnd : 0));
  }, [candidates, filter, sort, myMemberId]);

  if (!candidates.length)
    return (
      <EmptyState as="h2" title="The shortlist is empty" action={<ButtonLink href="/experiences">Browse experiences</ButtonLink>}>
        Use “Add to trip” on any experience to put it up for a group vote. Everyone's saved wishlist items can be proposed too.
      </EmptyState>
    );

  const unvoted = candidates.filter((c) => !c.votes.some((v) => v.memberId === myMemberId)).length;
  return (
    <div id="shortlist">
      <div className="mb-5 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="flex flex-wrap gap-1.5" role="group" aria-label="Filter shortlist">
          {(
            [
              ["all", `All (${candidates.length})`],
              ["unvoted", `Needs my vote (${unvoted})`],
              ["discussion", "In discussion"],
              ["approved", "Approved"],
              ["rejected", "Not selected"],
            ] as const
          ).map(([k, l]) => (
            <button key={k} type="button" aria-pressed={filter === k} onClick={() => setFilter(k)} className={cn("h-8 rounded-full border px-3 text-sm", filter === k ? "border-brand bg-brand text-brand-ink" : "border-line bg-surface text-muted hover:text-ink")}>
              {l}
            </button>
          ))}
        </div>
        <label className="flex items-center gap-2 text-sm">
          <span className="text-muted">Sort</span>
          <select className="field h-9 w-auto" value={sort} onChange={(e) => setSort(e.target.value as "score")}>
            <option value="score">Most popular</option>
            <option value="recent">Recently added</option>
            <option value="price">Cheapest first</option>
          </select>
        </label>
      </div>
      <ul className="space-y-4">
        {items.map((c) => (
          <CandidateCard key={c.id} c={c} tripId={tripId} myMemberId={myMemberId} canManage={canManage} votePrivacy={votePrivacy} members={members} />
        ))}
      </ul>
    </div>
  );
}

function CandidateCard({ c, myMemberId, canManage, votePrivacy, members }: { c: Candidate; tripId: string; myMemberId: string; canManage: boolean; votePrivacy: "named" | "anonymous"; members: Member[] }) {
  const toast = useToast();
  const confirm = useConfirm();
  const fx = useFx();
  const [pending, start] = useTransition();
  const [showComments, setShowComments] = useState(false);
  const [showManage, setShowManage] = useState(false);
  const [comment, setComment] = useState("");
  const [proxyFor, setProxyFor] = useState<string>("");
  const my = c.votes.find((v) => v.memberId === myMemberId)?.vote as Vote | undefined;
  const byMember = new Map(members.map((m) => [m.id, m]));
  const a = c.analysis;
  const total = members.length;
  const status = STATUS[c.status] ?? STATUS.discussion!;
  const run = (fn: () => Promise<{ ok: boolean; error?: string }>, ok?: string) =>
    start(async () => {
      const r = await fn();
      if (!r.ok) toast({ tone: "error", title: (r as { error: string }).error });
      else if (ok) toast({ tone: "success", title: ok });
    });
  const vote = (v: Vote) => {
    const target = proxyFor || myMemberId;
    const current = c.votes.find((x) => x.memberId === target)?.vote;
    run(() => castVote(c.id, current === v ? null : v, proxyFor || undefined), proxyFor ? `Vote recorded for ${byMember.get(proxyFor)?.name}` : undefined);
  };
  const unjoined = members.filter((m) => !m.joined);
  const participantIds = c.participants ?? members.map((m) => m.id);

  return (
    <li className="overflow-hidden rounded-md border border-line bg-surface">
      <div className="flex flex-col sm:flex-row">
        <div className="relative aspect-[16/9] shrink-0 bg-surface-2 sm:aspect-auto sm:w-52">
          <AtlasImage image={c.card?.image} fallbackLabel={c.card?.title ?? "Activity"} sizes="208px" credit="none" />
        </div>
        <div className="min-w-0 flex-1 p-4">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-1.5">
                <Badge tone={status.tone}>{status.label}</Badge>
                {c.card && <DecemberBadge status={c.card.decemberStatus} />}
                {a.flags.popularWithEveryone && <Badge tone="good">Everyone's keen</Badge>}
                {a.flags.divisive && <Badge tone="warn">Divisive</Badge>}
              </div>
              <h3 className="mt-1.5 font-sans text-lg font-semibold">
                {c.card ? <Link href={`/experiences/${c.card.slug}`} className="hover:text-accent">{c.card.title}</Link> : "Removed activity"}
              </h3>
              <p className="text-sm text-muted">{c.card?.destinationName} · {c.card?.durationText}</p>
            </div>
            <div className="text-right text-sm">
              <p className="font-semibold"><Money vnd={c.perPersonVnd} /> <span className="font-normal text-muted">pp</span></p>
              <p className="text-xs text-muted">{c.priceIsQuote && c.agreedPriceVnd != null ? "Agreed quote" : "Estimate"} · group ≈ <Money vnd={a.estimatedGroupVnd} showVnd={false} /> for {a.likelyCount}</p>
            </div>
          </div>

          {/* Tally */}
          <div className="mt-3">
            <div className="flex h-2.5 overflow-hidden rounded-full bg-surface-2" role="img" aria-label={VOTE_ORDER.map((v) => `${VOTE_LABELS[v]} ${a.counts[v]}`).join(", ")}>
              {VOTE_ORDER.map((v) => a.counts[v] > 0 && <span key={v} className={VOTE_COLOR[v]} style={{ width: `${(a.counts[v] / total) * 100}%` }} />)}
            </div>
            <p className="mt-1.5 flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted">
              {VOTE_ORDER.map((v) => (
                <span key={v} className="inline-flex items-center gap-1">
                  <span className={cn("size-2 rounded-[2px]", VOTE_COLOR[v])} />
                  {VOTE_LABELS[v]}: <strong className="text-ink tabular-nums">{a.counts[v]}</strong>
                </span>
              ))}
              <span>· {a.votedCount}/{total} voted</span>
            </p>
            {votePrivacy === "named" && c.votes.length > 0 && (
              <ul className="mt-2 flex flex-wrap gap-1.5">
                {c.votes.map((v) => {
                  const m = byMember.get(v.memberId);
                  if (!m) return null;
                  return (
                    <li key={v.memberId} className="inline-flex items-center gap-1.5 rounded-full border border-line py-0.5 pr-2 pl-0.5 text-xs">
                      <Avatar name={m.name} color={m.color} size={18} />
                      {m.name}: <span className="font-medium">{VOTE_LABELS[v.vote as Vote]}</span>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>

          {/* My vote */}
          <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:items-center">
            <span className="text-xs font-semibold text-muted uppercase">{proxyFor ? `Vote for ${byMember.get(proxyFor)?.name}` : "Your vote"}</span>
            <div className="flex flex-wrap gap-1.5" role="radiogroup" aria-label="Vote">
              {VOTE_ORDER.map((v) => {
                const current = (proxyFor ? c.votes.find((x) => x.memberId === proxyFor)?.vote : my) === v;
                return (
                  <button key={v} type="button" role="radio" aria-checked={current} disabled={pending} onClick={() => vote(v)}
                    className={cn("h-8 rounded-full border px-3 text-xs font-medium", current ? "border-brand bg-brand text-brand-ink" : "border-line hover:border-ink")}>
                    {VOTE_LABELS[v]}
                  </button>
                );
              })}
            </div>
            {canManage && unjoined.length > 0 && (
              <select aria-label="Record a vote on behalf of" className="field h-8 w-auto text-xs sm:ml-auto" value={proxyFor} onChange={(e) => setProxyFor(e.target.value)}>
                <option value="">Voting as me</option>
                {unjoined.map((m) => <option key={m.id} value={m.id}>For {m.name} (not joined)</option>)}
              </select>
            )}
          </div>

          <div className="mt-4 flex flex-wrap gap-2 border-t border-line pt-3">
            <Button size="sm" variant="ghost" aria-expanded={showComments} onClick={() => setShowComments((s) => !s)}>
              <MessageSquare className="size-4" /> {c.comments.length} comment{c.comments.length === 1 ? "" : "s"}
              <ChevronDown className={cn("size-3.5 transition-transform", showComments && "rotate-180")} />
            </Button>
            {canManage && (
              <Button size="sm" variant="ghost" aria-expanded={showManage} onClick={() => setShowManage((s) => !s)}>
                <Settings2 className="size-4" /> Decide & participants
              </Button>
            )}
            {(canManage || c.addedBy === myMemberId) && (
              <Button size="sm" variant="ghost" className="ml-auto text-bad" disabled={pending}
                onClick={async () => (await confirm({ title: "Remove from shortlist?", description: "All votes and comments on this item will be deleted.", confirmLabel: "Remove", tone: "danger" })) && run(() => removeCandidate(c.id), "Removed from shortlist")}>
                <Trash2 className="size-4" /> Remove
              </Button>
            )}
          </div>

          {showComments && (
            <div className="mt-3 space-y-3">
              {c.comments.map((x) => {
                const m = byMember.get(x.memberId);
                return (
                  <div key={x.id} className="flex gap-2.5 text-sm">
                    <Avatar name={m?.name ?? "?"} color={m?.color ?? "#777"} size={26} />
                    <div className="min-w-0 flex-1 rounded-md bg-surface-2 px-3 py-2">
                      <p className="text-xs text-muted"><strong className="text-ink">{m?.name}</strong> · {new Date(x.createdAt).toLocaleString("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}</p>
                      <p className="mt-0.5 whitespace-pre-wrap">{x.body}</p>
                    </div>
                    {x.memberId === myMemberId && (
                      <button type="button" aria-label="Delete comment" className="self-start text-muted hover:text-bad" onClick={() => run(() => deleteComment(x.id))}>
                        <Trash2 className="size-3.5" />
                      </button>
                    )}
                  </div>
                );
              })}
              <form className="flex gap-2" onSubmit={(e) => { e.preventDefault(); if (!comment.trim()) return; run(async () => { const r = await addComment(c.id, comment); if (r.ok) setComment(""); return r; }); }}>
                <label htmlFor={`cm-${c.id}`} className="sr-only">Add a comment</label>
                <input id={`cm-${c.id}`} value={comment} onChange={(e) => setComment(e.target.value)} placeholder="Add a comment…" maxLength={1000} className="field h-9" />
                <Button type="submit" size="sm" disabled={pending || !comment.trim()}>Post</Button>
              </form>
            </div>
          )}

          {showManage && canManage && (
            <div className="mt-3 grid gap-4 rounded-md border border-line bg-surface-2 p-4 md:grid-cols-2">
              <div>
                <p className="mb-2 text-sm font-semibold">Group decision</p>
                <div className="flex flex-wrap gap-1.5">
                  {(["discussion", "approved", "rejected", "completed"] as const).map((s) => (
                    <button key={s} type="button" aria-pressed={c.status === s} disabled={pending} onClick={() => run(() => setCandidateStatus(c.id, s), `Marked “${STATUS[s]!.label}”`)}
                      className={cn("h-8 rounded-full border px-3 text-xs", c.status === s ? "border-brand bg-brand text-brand-ink" : "border-line-strong bg-surface")}>
                      {STATUS[s]!.label}
                    </button>
                  ))}
                </div>
                <p className="mt-2 text-xs text-muted">Suggestions never apply automatically: the owner or an editor decides.</p>
                <PriceEditor c={c} inrToVnd={fx.inrToVnd} onSave={(vnd, quote) => run(() => setCandidateParticipation(c.id, { participants: c.participants, agreedPriceVnd: vnd, priceIsQuote: quote }), "Price updated")} />
              </div>
              <fieldset>
                <legend className="mb-2 text-sm font-semibold">Who's taking part? <span className="font-normal text-muted">({participantIds.length}/{members.length})</span></legend>
                <ul className="grid grid-cols-2 gap-1">
                  {members.map((m) => {
                    const on = participantIds.includes(m.id);
                    return (
                      <li key={m.id}>
                        <label className="flex items-center gap-2 text-sm">
                          <input type="checkbox" className="size-4 accent-[var(--brand)]" checked={on} disabled={pending}
                            onChange={() => { const next = on ? participantIds.filter((x) => x !== m.id) : [...participantIds, m.id]; if (!next.length) return; run(() => setCandidateParticipation(c.id, { participants: next, participation: next.length === members.length ? "everyone" : "optional" })); }} />
                          {m.name}
                        </label>
                      </li>
                    );
                  })}
                </ul>
                <div className="mt-2 flex gap-2 text-xs">
                  {votePrivacy === "named" && a.likelyParticipants.length > 0 && (
                    <button type="button" className="font-semibold text-accent hover:underline" onClick={() => run(() => setCandidateParticipation(c.id, { participants: a.likelyParticipants }))}>Use votes ({a.likelyParticipants.length})</button>
                  )}
                  <button type="button" className="font-semibold text-accent hover:underline" onClick={() => run(() => setCandidateParticipation(c.id, { participants: null, participation: "everyone" }))}>Everyone</button>
                </div>
                <p className="mt-2 text-xs text-muted">Costs are split only across participants.</p>
              </fieldset>
            </div>
          )}
        </div>
      </div>
    </li>
  );
}

function PriceEditor({ c, inrToVnd, onSave }: { c: Candidate; inrToVnd: number; onSave: (vnd: number | null, quote: boolean) => void }) {
  const [inr, setInr] = useState(c.agreedPriceVnd != null ? String(Math.round(c.agreedPriceVnd / inrToVnd)) : "");
  const [quote, setQuote] = useState(c.priceIsQuote);
  return (
    <form className="mt-4" onSubmit={(e) => { e.preventDefault(); onSave(inr ? Math.round(Number(inr) * inrToVnd) : null, quote); }}>
      <label htmlFor={`pp-${c.id}`} className="mb-1 block text-sm font-semibold">Agreed price per person (₹)</label>
      <div className="flex gap-2">
        <input id={`pp-${c.id}`} type="number" min={0} className="field h-9" value={inr} onChange={(e) => setInr(e.target.value)} placeholder="Leave blank to use the estimate" />
        <Button type="submit" size="sm" variant="outline">Save</Button>
      </div>
      <label className="mt-2 flex items-center gap-2 text-xs"><input type="checkbox" checked={quote} onChange={(e) => setQuote(e.target.checked)} className="size-3.5 accent-[var(--brand)]" />This is an actual quotation from an operator</label>
    </form>
  );
}
