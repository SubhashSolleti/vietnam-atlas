"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { addCandidate, joinTrip } from "@/app/actions/trips";
import { Avatar } from "@/components/ui/avatar";
import { Button, ButtonLink } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/form";
import { useToast } from "@/components/ui/toast";
import { cn } from "@/lib/utils";

export function JoinForm({
  code,
  tripId,
  seats,
  alreadyMember,
  addActivityId,
  defaultName,
}: {
  code: string;
  tripId: string;
  seats: { id: string; name: string; color: string; claimed: boolean; type: string; role: string }[];
  alreadyMember: boolean;
  addActivityId: string | null;
  defaultName: string;
}) {
  const router = useRouter();
  const toast = useToast();
  const free = seats.filter((s) => !s.claimed);
  const [seat, setSeat] = useState<string | "new">(free[0]?.id ?? "new");
  const [name, setName] = useState(defaultName);
  const [error, setError] = useState<string>();
  const [pending, start] = useTransition();

  if (alreadyMember)
    return (
      <div className="mt-8 rounded-md border border-line bg-surface p-6">
        <p>You're already part of this trip.</p>
        <ButtonLink href={`/group/${tripId}`} className="mt-4">Open the workspace</ButtonLink>
      </div>
    );

  return (
    <form
      className="mt-8 space-y-6 rounded-md border border-line bg-surface p-6"
      onSubmit={(e) => {
        e.preventDefault();
        setError(undefined);
        start(async () => {
          const r = await joinTrip({ code, seatId: seat === "new" ? undefined : seat, displayName: name.trim() || undefined });
          if (!r.ok) {
            setError(r.error);
            return;
          }
          if (addActivityId) await addCandidate(r.tripId, addActivityId);
          toast({ tone: "success", title: "You've joined the trip" });
          router.push(`/group/${r.tripId}?tab=preferences`);
        });
      }}
    >
      <fieldset>
        <legend className="mb-3 font-semibold">Which traveller are you?</legend>
        <ul className="grid gap-2 sm:grid-cols-2">
          {seats.map((s) => (
            <li key={s.id}>
              <label className={cn("flex items-center gap-3 rounded-md border px-3 py-2.5", s.claimed ? "cursor-not-allowed border-line opacity-55" : "cursor-pointer border-line hover:border-ink has-[:checked]:border-brand has-[:checked]:bg-surface-2")}>
                <input type="radio" name="seat" value={s.id} disabled={s.claimed} checked={seat === s.id} onChange={() => setSeat(s.id)} className="size-4 accent-[var(--brand)]" />
                <Avatar name={s.name} color={s.color} size={30} muted={s.claimed} />
                <span className="text-sm">
                  <span className="block font-medium">{s.name}</span>
                  <span className="text-xs text-muted">{s.claimed ? "Already joined" : `${s.type === "couple" ? "Couple" : "Solo"}${s.role === "owner" ? " · Trip owner" : s.role === "editor" ? " · Editor" : ""}`}</span>
                </span>
              </label>
            </li>
          ))}
          <li>
            <label className="flex cursor-pointer items-center gap-3 rounded-md border border-dashed border-line-strong px-3 py-2.5 has-[:checked]:border-brand has-[:checked]:bg-surface-2">
              <input type="radio" name="seat" value="new" checked={seat === "new"} onChange={() => setSeat("new")} className="size-4 accent-[var(--brand)]" />
              <span className="text-sm font-medium">I'm not listed: add me</span>
            </label>
          </li>
        </ul>
      </fieldset>
      <Field label={seat === "new" ? "Your name" : "Your name (optional: replaces the seat name)"} name="displayName" error={error}>
        {(p) => <Input {...p} value={name} onChange={(e) => setName(e.target.value)} maxLength={40} required={seat === "new"} placeholder="e.g. Priya" />}
      </Field>
      <Button type="submit" size="lg" disabled={pending}>{pending ? "Joining…" : "Join trip"}</Button>
    </form>
  );
}
