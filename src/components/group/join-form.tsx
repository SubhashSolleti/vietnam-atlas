"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { addCandidate, joinTrip } from "@/app/actions/trips";
import { Button, ButtonLink } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/form";
import { useToast } from "@/components/ui/toast";

/** Joining takes only a name: no account, no password and no seat to pick. */
export function JoinForm({
  code,
  tripId,
  alreadyMember,
  addActivityId,
  defaultName,
}: {
  code: string;
  tripId: string;
  alreadyMember: boolean;
  addActivityId: string | null;
  defaultName: string;
}) {
  const router = useRouter();
  const toast = useToast();
  const [name, setName] = useState(defaultName);
  const [error, setError] = useState<string>();
  const [pending, start] = useTransition();

  if (alreadyMember)
    return (
      <div className="mt-8 rounded-md border border-line bg-surface p-6">
        <p>You're already part of this trip.</p>
        <ButtonLink href={`/group/${tripId}?tab=plan`} className="mt-4">Open your board</ButtonLink>
      </div>
    );

  return (
    <form
      className="mt-8 space-y-5 rounded-md border border-line bg-surface p-6"
      onSubmit={(e) => {
        e.preventDefault();
        setError(undefined);
        if (!name.trim()) return setError("Enter your name so the group knows who you are.");
        start(async () => {
          const r = await joinTrip({ code, displayName: name.trim() });
          if (!r.ok) {
            setError(r.error);
            return;
          }
          if (addActivityId) await addCandidate(r.tripId, addActivityId);
          toast({ tone: "success", title: "You've joined the trip" });
          router.push(`/group/${r.tripId}?tab=plan`);
        });
      }}
    >
      <Field label="Your name" name="displayName" error={error} hint="No account or password needed: your name is how the group sees your picks.">
        {(p) => <Input {...p} value={name} onChange={(e) => setName(e.target.value)} maxLength={40} required autoComplete="given-name" placeholder="e.g. Priya" />}
      </Field>
      <Button type="submit" size="lg" disabled={pending}>{pending ? "Joining…" : "Join trip"}</Button>
    </form>
  );
}
