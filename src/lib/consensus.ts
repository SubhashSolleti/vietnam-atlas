/**
 * Group consensus engine: pure functions. Produces *suggestions*; it never changes data.
 */

export type Vote = "must_do" | "interested" | "neutral" | "not_interested" | "cannot";

export const VOTE_SCORE: Record<Vote, number> = {
  must_do: 2,
  interested: 1,
  neutral: 0,
  not_interested: -1,
  cannot: -2,
};

export interface ConsensusMember {
  id: string;
  travellerType: "couple" | "solo";
}

export interface ConsensusCandidate {
  id: string;
  title: string;
  votes: { memberId: string; vote: Vote }[];
  perPersonVnd: number;
  /** 0–3 suitability score for the trip months (min across months). */
  seasonScore: number;
  decemberStatus?: string;
  availability?: string;
  /** Already approved or scheduled: its cost is already inside the remaining-budget figure. */
  alreadyBudgeted?: boolean;
}

export interface CandidateAnalysis {
  id: string;
  counts: Record<Vote, number>;
  votedCount: number;
  score: number;
  avgScore: number;
  coupleAvg: number | null;
  soloAvg: number | null;
  /** Members who did not say not_interested / cannot (empty when votes are anonymous. Use likelyCount). */
  likelyParticipants: string[];
  likelyCount: number;
  estimatedGroupVnd: number;
  flags: {
    popularWithEveryone: boolean;
    popularWithCouples: boolean;
    popularWithSolo: boolean;
    lowInterest: boolean;
    exceedsBudget: boolean;
    seasonUnsuitable: boolean;
    divisive: boolean;
  };
}

const avg = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : null);

export function analyseCandidate(
  c: ConsensusCandidate,
  members: ConsensusMember[],
  opts: { remainingPerPersonVnd?: number | null } = {},
): CandidateAnalysis {
  const counts: Record<Vote, number> = { must_do: 0, interested: 0, neutral: 0, not_interested: 0, cannot: 0 };
  const byMember = new Map(c.votes.map((v) => [v.memberId, v.vote]));
  for (const v of c.votes) counts[v.vote]++;
  const scores = c.votes.map((v) => VOTE_SCORE[v.vote]);
  const score = scores.reduce((a, b) => a + b, 0);
  const typeAvg = (type: "couple" | "solo") =>
    avg(
      members
        .filter((m) => m.travellerType === type && byMember.has(m.id))
        .map((m) => VOTE_SCORE[byMember.get(m.id)!]),
    );
  const coupleAvg = typeAvg("couple");
  const soloAvg = typeAvg("solo");
  // "Popular with X" needs enough of X to have voted: at least two of them, or all of them if there are fewer.
  const enoughVoters = (type: "couple" | "solo") => {
    const ofType = members.filter((m) => m.travellerType === type);
    const voted = ofType.filter((m) => byMember.has(m.id)).length;
    return ofType.length > 0 && voted >= Math.min(2, ofType.length);
  };
  const likelyParticipants = members
    .filter((m) => {
      const v = byMember.get(m.id);
      return v !== "not_interested" && v !== "cannot";
    })
    .map((m) => m.id);
  const positive = counts.must_do + counts.interested;
  const negative = counts.not_interested + counts.cannot;
  const quorum = c.votes.length >= Math.ceil(members.length * 0.6);
  const avgScore = avg(scores) ?? 0;
  const remaining = opts.remainingPerPersonVnd;
  // "Only one fan" is low interest in a real group, but not on a solo or two-person trip.
  const lowInterest = c.votes.length > 0 && (avgScore <= 0 || positive <= (members.length >= 4 ? 1 : 0));

  return {
    id: c.id,
    counts,
    votedCount: c.votes.length,
    score,
    avgScore,
    coupleAvg,
    soloAvg,
    likelyParticipants,
    likelyCount: likelyParticipants.length,
    estimatedGroupVnd: c.perPersonVnd * likelyParticipants.length,
    flags: {
      popularWithEveryone: quorum && negative === 0 && positive >= Math.ceil(members.length * 0.6),
      popularWithCouples: !lowInterest && coupleAvg != null && coupleAvg >= 1 && enoughVoters("couple"),
      popularWithSolo: !lowInterest && soloAvg != null && soloAvg >= 1 && enoughVoters("solo"),
      lowInterest,
      exceedsBudget: !c.alreadyBudgeted && remaining != null && c.perPersonVnd > Math.max(0, remaining),
      seasonUnsuitable:
        c.seasonScore <= 1 ||
        c.decemberStatus === "closed" ||
        c.decemberStatus === "poor" ||
        c.availability === "temporarily_closed",
      divisive: positive >= 2 && negative >= 2,
    },
  };
}

/**
 * Suggested shortlist: positively-voted, season-suitable candidates ordered by score.
 * Returned for display only: the group decides.
 */
export function suggestShortlist(analyses: CandidateAnalysis[], limit = 12) {
  return analyses
    .filter((a) => a.votedCount > 0 && a.avgScore >= 0.75 && !a.flags.seasonUnsuitable && !a.flags.lowInterest)
    .sort((a, b) => b.score - a.score || b.avgScore - a.avgScore)
    .slice(0, limit);
}
