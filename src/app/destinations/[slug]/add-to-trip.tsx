"use client";

import { CalendarPlus } from "lucide-react";
import Link from "next/link";
import { useEffect, useState, useTransition } from "react";
import { updateDay } from "@/app/actions/itinerary";
import { useUserState } from "@/components/site/user-state";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { useToast } from "@/components/ui/toast";
import { formatDay } from "@/lib/utils";

type Day = { id: string; date: string; destinationName: string | null };

/** Assign this destination to one or more days of the active trip. */
export function AddDestinationToTrip({ destinationId, name }: { destinationId: string; name: string }) {
  const { state } = useUserState();
  const toast = useToast();
  const [open, setOpen] = useState(false);
  const [days, setDays] = useState<Day[] | null>(null);
  const [picked, setPicked] = useState<string[]>([]);
  const [pending, start] = useTransition();

  useEffect(() => {
    if (!open || !state.activeTripId) return;
    fetch(`/api/trips/${state.activeTripId}/days`)
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((d: { days: Day[] }) => setDays(d.days))
      .catch(() => setDays([]));
  }, [open, state.activeTripId]);

  const activeTrip = state.trips.find((t) => t.id === state.activeTripId);

  return (
    <>
      <Button size="lg" className="h-12 border border-white/40 bg-white/10 text-white backdrop-blur hover:bg-white/20" onClick={() => setOpen(true)}>
        <CalendarPlus className="size-4" /> Add to trip
      </Button>
      <Dialog
        open={open}
        onClose={() => setOpen(false)}
        title={`Add ${name} to your trip`}
        description={activeTrip ? `Choose the days you'll be based in ${name} on “${activeTrip.name}”.` : undefined}
        footer={
          activeTrip && (
            <>
              <Button variant="ghost" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button
                disabled={!picked.length || pending}
                onClick={() =>
                  start(async () => {
                    for (const id of picked) {
                      const r = await updateDay(id, { destinationId });
                      if (!r.ok) {
                        toast({ tone: "error", title: r.error });
                        return;
                      }
                    }
                    toast({ tone: "success", title: `${name} added to ${picked.length} day${picked.length > 1 ? "s" : ""}`, action: { label: "Open itinerary", href: "/trip" } });
                    setOpen(false);
                    setPicked([]);
                  })
                }
              >
                Add to {picked.length || ""} day{picked.length === 1 ? "" : "s"}
              </Button>
            </>
          )
        }
      >
        {!activeTrip ? (
          <div className="space-y-3 text-sm">
            <p className="text-muted">You're not part of a trip yet.</p>
            <div className="flex flex-wrap gap-2">
              <Link href="/group" className="font-semibold text-accent underline">
                Join with an invite code
              </Link>
              <span className="text-muted">or</span>
              <Link href="/group/new" className="font-semibold text-accent underline">
                create a trip
              </Link>
            </div>
          </div>
        ) : days === null ? (
          <div className="space-y-2">
            {Array.from({ length: 5 }, (_, i) => (
              <div key={i} className="skeleton h-10 rounded-sm" />
            ))}
          </div>
        ) : (
          <fieldset>
            <legend className="sr-only">Days</legend>
            <ul className="grid gap-1.5 sm:grid-cols-2">
              {days.map((d) => (
                <li key={d.id}>
                  <label className="flex cursor-pointer items-center gap-3 rounded-sm border border-line px-3 py-2 text-sm has-[:checked]:border-brand has-[:checked]:bg-surface-2">
                    <input
                      type="checkbox"
                      className="size-4 accent-[var(--brand)]"
                      checked={picked.includes(d.id)}
                      onChange={(e) => setPicked((p) => (e.target.checked ? [...p, d.id] : p.filter((x) => x !== d.id)))}
                    />
                    <span>
                      <span className="font-medium">{formatDay(d.date)}</span>
                      <span className="block text-xs text-muted">{d.destinationName ?? "Not planned yet"}</span>
                    </span>
                  </label>
                </li>
              ))}
            </ul>
          </fieldset>
        )}
      </Dialog>
    </>
  );
}
