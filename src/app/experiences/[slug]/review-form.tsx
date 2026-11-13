"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { submitReview } from "@/app/actions/account";
import { useUserState } from "@/components/site/user-state";
import { Button } from "@/components/ui/button";
import { FieldError, Label, Textarea } from "@/components/ui/form";
import { useToast } from "@/components/ui/toast";
import { cn } from "@/lib/utils";

export function ReviewForm({ activityId }: { activityId: string }) {
  const { state } = useUserState();
  const toast = useToast();
  const [open, setOpen] = useState(false);
  const [rating, setRating] = useState(0);
  const [body, setBody] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  if (!state.user || state.user.isGuest)
    return (
      <p className="mt-4 text-sm text-muted">
        Been already? <Link href="/register" className="font-semibold text-accent underline">Create a free account</Link> to share a moderated community review.
      </p>
    );
  if (!open)
    return (
      <Button variant="outline" size="sm" className="mt-4" onClick={() => setOpen(true)}>
        Write a review
      </Button>
    );
  return (
    <form
      className="mt-4 space-y-3 rounded-md border border-line bg-surface p-4"
      onSubmit={(e) => {
        e.preventDefault();
        setError(null);
        if (!rating) return setError("Choose a rating.");
        start(async () => {
          const r = await submitReview({ activityId, rating, body });
          if (!r.ok) setError(r.error);
          else {
            toast({ tone: "success", title: "Thanks: your review is awaiting moderation" });
            setOpen(false);
            setBody("");
            setRating(0);
          }
        });
      }}
    >
      <fieldset>
        <legend className="mb-1.5 text-sm font-medium">Your rating</legend>
        <div className="flex gap-1">
          {[1, 2, 3, 4, 5].map((n) => (
            <label key={n} className="cursor-pointer">
              <input type="radio" name="rating" value={n} className="sr-only" checked={rating === n} onChange={() => setRating(n)} />
              <span className={cn("text-2xl", n <= rating ? "text-highlight" : "text-line-strong")} aria-hidden>★</span>
              <span className="sr-only">{n} star{n > 1 ? "s" : ""}</span>
            </label>
          ))}
        </div>
      </fieldset>
      <div>
        <Label htmlFor="review-body">Your experience</Label>
        <Textarea id="review-body" value={body} onChange={(e) => setBody(e.target.value)} minLength={30} maxLength={2000} required />
      </div>
      <FieldError>{error}</FieldError>
      <div className="flex gap-2">
        <Button type="submit" size="sm" disabled={pending}>Submit for moderation</Button>
        <Button variant="ghost" size="sm" onClick={() => setOpen(false)}>Cancel</Button>
      </div>
    </form>
  );
}
