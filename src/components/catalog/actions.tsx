"use client";

import { Check, Columns3, Heart, Link2, Plus, Share2, Users } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toggleCompare, toggleWishlist } from "@/app/actions/wishlist";
import { addCandidate, setActiveTrip } from "@/app/actions/trips";
import { useUserState } from "@/components/site/user-state";
import { Button, buttonClass } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { useToast } from "@/components/ui/toast";
import { cn } from "@/lib/utils";

type EntityType = "activity" | "attraction" | "destination";

export function SaveButton({
  entityType,
  entityId,
  title,
  variant = "icon",
  className,
}: {
  entityType: EntityType;
  entityId: string;
  title: string;
  variant?: "icon" | "button" | "overlay";
  className?: string;
}) {
  const { state, apply } = useUserState();
  const toast = useToast();
  const key = `${entityType}:${entityId}`;
  const saved = !!state.saved[key];

  const onClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    apply({ type: "save", key, saved: !saved }, async () => {
      const res = await toggleWishlist({ entityType, entityId, save: !saved });
      if (!res.ok) toast({ tone: "error", title: res.error });
      else
        toast({
          tone: "success",
          title: res.saved ? `Saved “${title}”` : `Removed “${title}”`,
          action: res.saved ? { label: "View wishlist", href: "/wishlist" } : undefined,
        });
    });
  };

  if (variant === "button")
    return (
      <Button variant={saved ? "secondary" : "outline"} onClick={onClick} aria-pressed={saved} className={className}>
        <Heart className={cn("size-4", saved && "fill-accent text-accent")} />
        {saved ? "Saved" : "Save to wishlist"}
      </Button>
    );

  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={saved}
      aria-label={saved ? `Remove ${title} from wishlist` : `Save ${title} to wishlist`}
      title={saved ? "Saved: click to remove" : "Save to wishlist"}
      className={cn(
        "grid size-10 place-items-center rounded-full transition-transform active:scale-90",
        variant === "overlay" ? "bg-white/90 text-charcoal shadow-sm backdrop-blur hover:bg-white" : "text-muted hover:bg-surface-2 hover:text-ink",
        className,
      )}
    >
      <Heart className={cn("size-[18px]", saved && "fill-accent text-accent")} />
    </button>
  );
}

export function CompareButton({ activityId, title, size = "sm", className }: { activityId: string; title: string; size?: "sm" | "md"; className?: string }) {
  const { state, apply } = useUserState();
  const toast = useToast();
  const on = state.compareIds.includes(activityId);
  return (
    <Button
      variant={on ? "secondary" : "ghost"}
      size={size}
      aria-pressed={on}
      className={className}
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        apply({ type: "compare", id: activityId, on: !on }, async () => {
          const res = await toggleCompare(activityId, !on);
          if (!res.ok) toast({ tone: "error", title: res.error });
          else if (res.inCompare)
            toast({ tone: "success", title: `Added “${title}” to comparison`, description: `${res.count} of 4 selected`, action: { label: "Compare now", href: "/wishlist/compare" } });
        });
      }}
    >
      {on ? <Check className="size-4" /> : <Columns3 className="size-4" />}
      {on ? "Comparing" : "Compare"}
    </Button>
  );
}

/** Adds an activity to the group shortlist ("trip cart") of the active trip. */
export function AddToTripButton({
  activityId,
  title,
  size = "sm",
  variant = "primary",
  className,
  label = "Add to trip",
}: {
  activityId: string;
  title: string;
  size?: "xs" | "sm" | "md" | "lg";
  variant?: "primary" | "outline" | "secondary";
  className?: string;
  label?: string;
}) {
  const { state, apply } = useUserState();
  const toast = useToast();
  const router = useRouter();
  const [choose, setChoose] = useState(false);
  const status = state.activeTripCandidates[activityId];

  const add = (tripId: string) =>
    apply({ type: "candidate", activityId, status: "discussion" }, async () => {
      if (tripId !== state.activeTripId) await setActiveTrip(tripId);
      const res = await addCandidate(tripId, activityId);
      if (!res.ok) toast({ tone: "error", title: res.error });
      else
        toast({
          tone: "success",
          title: res.created ? `Added to the group shortlist` : `Already on the shortlist`,
          description: `“${title}”: the group can now vote on it.`,
          action: { label: "Open group planner", href: "/group" },
        });
    });

  if (status)
    return (
      <Link href="/group" className={buttonClass("secondary", size, className)} onClick={(e) => e.stopPropagation()}>
        <Users className="size-4" />
        {status === "scheduled" ? "In itinerary" : status === "approved" ? "Group approved" : status === "rejected" ? "Not selected" : "On shortlist"}
      </Link>
    );

  return (
    <>
      <Button
        size={size}
        variant={variant}
        className={className}
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          if (state.trips.length === 1 && state.activeTripId) add(state.activeTripId);
          else setChoose(true);
        }}
      >
        <Plus className="size-4" />
        {label}
      </Button>
      <Dialog
        open={choose}
        onClose={() => setChoose(false)}
        title={state.trips.length ? "Add to which trip?" : "Start or join a trip"}
        description={state.trips.length ? `“${title}” will be added to the group shortlist for voting.` : "Shortlists live inside a trip so your group can vote together."}
        size="sm"
      >
        {state.trips.length ? (
          <ul className="space-y-2">
            {state.trips.map((t) => (
              <li key={t.id}>
                <button
                  type="button"
                  onClick={() => {
                    setChoose(false);
                    add(t.id);
                  }}
                  className="flex w-full items-center justify-between rounded-md border border-line px-4 py-3 text-left hover:border-ink"
                >
                  <span className="font-medium">{t.name}</span>
                  {t.id === state.activeTripId && <span className="text-xs text-muted">Active</span>}
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <div className="space-y-3">
            <p className="text-sm text-muted">You're not part of a trip yet. Create one, or join your group with the invite code they shared.</p>
            <div className="flex flex-wrap gap-2">
              <Button onClick={() => router.push("/group/new")}>Create a new trip</Button>
              <Button variant="outline" onClick={() => router.push("/group")}>
                Join with an invite code
              </Button>
            </div>
          </div>
        )}
      </Dialog>
    </>
  );
}

export function ShareButton({ title, path, text, size = "sm", variant = "ghost", className }: { title: string; path: string; text?: string; size?: "sm" | "md"; variant?: "ghost" | "outline" | "light"; className?: string }) {
  const toast = useToast();
  return (
    <Button
      size={size}
      variant={variant}
      className={className}
      onClick={async (e) => {
        e.preventDefault();
        e.stopPropagation();
        const url = new URL(path, window.location.origin).toString();
        try {
          if (navigator.share && window.matchMedia("(pointer: coarse)").matches) {
            await navigator.share({ title, text, url });
            return;
          }
          await navigator.clipboard.writeText(url);
          toast({ tone: "success", title: "Link copied", description: url });
        } catch (err) {
          if ((err as Error).name === "AbortError") return;
          toast({ tone: "error", title: "Couldn't copy the link", description: url });
        }
      }}
    >
      <Share2 className="size-4" />
      Share
    </Button>
  );
}

export function CopyButton({ value, label = "Copy", className }: { value: string; label?: string; className?: string }) {
  const toast = useToast();
  return (
    <Button
      size="sm"
      variant="outline"
      className={className}
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(value.startsWith("/") ? new URL(value, window.location.origin).toString() : value);
          toast({ tone: "success", title: "Copied to clipboard" });
        } catch {
          toast({ tone: "error", title: "Couldn't access the clipboard" });
        }
      }}
    >
      <Link2 className="size-4" />
      {label}
    </Button>
  );
}
