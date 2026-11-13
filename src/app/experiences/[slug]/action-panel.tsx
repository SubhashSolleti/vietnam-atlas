"use client";

import { Flame, NotebookPen, Star, ThumbsUp, Trash2 } from "lucide-react";
import Link from "next/link";
import { useState, useTransition } from "react";
import { castVote } from "@/app/actions/trips";
import { removeWishlistItems, setWishlistState } from "@/app/actions/wishlist";
import { AddToTripButton, CompareButton, SaveButton, ShareButton } from "@/components/catalog/actions";
import { useUserState } from "@/components/site/user-state";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/form";
import { useToast } from "@/components/ui/toast";
import { VOTE_LABELS } from "@/content/taxonomy";
import { cn } from "@/lib/utils";

type VoteKey = keyof typeof VOTE_LABELS;

export function ActivityActionPanel({
  activityId,
  title,
  slug,
  summary,
  myVote,
  candidateId,
}: {
  activityId: string;
  title: string;
  slug: string;
  summary: string;
  myVote: VoteKey | null;
  candidateId: string | null;
}) {
  const { state } = useUserState();
  const toast = useToast();
  const [pending, start] = useTransition();
  const [noteOpen, setNoteOpen] = useState(false);
  const saved = state.saved[`activity:${activityId}`];
  const [note, setNote] = useState(saved?.note ?? "");

  const setState = (s: "interested" | "must_do" | "wishlist") =>
    start(async () => {
      const next = saved?.state === s ? "wishlist" : s;
      const r = await setWishlistState({ entityType: "activity", entityId: activityId, state: next, priority: next === "must_do" ? 3 : undefined });
      toast(r.ok ? { tone: "success", title: next === "must_do" ? "Marked as a must-do" : next === "interested" ? "Marked as interested" : "Saved to wishlist" } : { tone: "error", title: r.error });
    });

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-2">
        <SaveButton entityType="activity" entityId={activityId} title={title} variant="button" className="col-span-2 w-full" />
        <Button variant={saved?.state === "interested" ? "secondary" : "outline"} size="sm" aria-pressed={saved?.state === "interested"} onClick={() => setState("interested")} disabled={pending}>
          <ThumbsUp className={cn("size-4", saved?.state === "interested" && "fill-current")} /> Interested
        </Button>
        <Button variant={saved?.state === "must_do" ? "secondary" : "outline"} size="sm" aria-pressed={saved?.state === "must_do"} onClick={() => setState("must_do")} disabled={pending}>
          <Flame className={cn("size-4", saved?.state === "must_do" && "fill-accent text-accent")} /> Must-do
        </Button>
        <CompareButton activityId={activityId} title={title} className="border border-line" />
        <Button variant="outline" size="sm" onClick={() => setNoteOpen(true)}>
          <NotebookPen className="size-4" /> {saved?.note ? "Edit note" : "Add note"}
        </Button>
        <ShareButton title={title} path={`/experiences/${slug}`} text={summary} variant="outline" className="col-span-1" />
        {saved && (
          <Button
            variant="ghost"
            size="sm"
            className="text-bad"
            disabled={pending}
            onClick={() =>
              start(async () => {
                const r = await removeWishlistItems([saved.id]);
                toast(r.ok ? { tone: "success", title: "Removed from your selection" } : { tone: "error", title: r.error });
              })
            }
          >
            <Trash2 className="size-4" /> Remove
          </Button>
        )}
      </div>
      {saved?.note && <p className="rounded-sm bg-highlight-soft px-3 py-2 text-sm"><strong>Your note:</strong> {saved.note}</p>}

      <div className="border-t border-line pt-4">
        <p className="mb-2 text-sm font-semibold">Group trip</p>
        <AddToTripButton activityId={activityId} title={title} size="md" className="w-full" label="Add to trip shortlist" />
        {candidateId && (
          <div className="mt-3">
            <p className="mb-1.5 text-xs text-muted">Your vote</p>
            <div className="flex flex-wrap gap-1.5" role="radiogroup" aria-label="Your vote">
              {(Object.keys(VOTE_LABELS) as VoteKey[]).map((v) => (
                <button
                  key={v}
                  type="button"
                  role="radio"
                  aria-checked={myVote === v}
                  disabled={pending}
                  onClick={() =>
                    start(async () => {
                      const r = await castVote(candidateId, myVote === v ? null : v);
                      toast(r.ok ? { tone: "success", title: myVote === v ? "Vote cleared" : `Voted “${VOTE_LABELS[v]}”` } : { tone: "error", title: r.error });
                    })
                  }
                  className={cn("h-7 rounded-full border px-2.5 text-xs", myVote === v ? "border-brand bg-brand text-brand-ink" : "border-line hover:border-ink")}
                >
                  {VOTE_LABELS[v]}
                </button>
              ))}
            </div>
            <Link href="/group#shortlist" className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-accent hover:underline">
              <Star className="size-3" /> See group votes & comments
            </Link>
          </div>
        )}
      </div>

      <Dialog
        open={noteOpen}
        onClose={() => setNoteOpen(false)}
        title="Personal note"
        description="Only you can see this note."
        size="sm"
        footer={
          <>
            <Button variant="ghost" onClick={() => setNoteOpen(false)}>
              Cancel
            </Button>
            <Button
              disabled={pending}
              onClick={() =>
                start(async () => {
                  const r = await setWishlistState({ entityType: "activity", entityId: activityId, note: note });
                  if (r.ok) {
                    toast({ tone: "success", title: "Note saved" });
                    setNoteOpen(false);
                  } else toast({ tone: "error", title: r.error });
                })
              }
            >
              Save note
            </Button>
          </>
        }
      >
        <label htmlFor="act-note" className="sr-only">
          Note
        </label>
        <Textarea id="act-note" value={note} onChange={(e) => setNote(e.target.value)} maxLength={1000} rows={5} placeholder="e.g. Ask about vegetarian lunch; book the morning slot" />
      </Dialog>
    </div>
  );
}
