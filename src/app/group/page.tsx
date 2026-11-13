import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { KeyRound, Plus } from "lucide-react";
import { getCurrentUser } from "@/lib/auth";
import { resolveActiveTrip } from "@/services/trips";
import { ButtonLink } from "@/components/ui/button";
import { JoinByCode } from "@/components/group/join-by-code";

export const metadata: Metadata = { title: "Group Planner", description: "Plan one trip together: invite travellers, collect preferences, vote on experiences and agree a shortlist." };

export default async function GroupLanding() {
  const user = await getCurrentUser();
  const active = await resolveActiveTrip(user?.id);
  if (active) redirect(`/group/${active.trip.id}`);
  return (
    <div className="container-x max-w-5xl pt-12">
      <p className="eyebrow mb-2">Group planner</p>
      <h1 className="text-4xl md:text-6xl">Plan one trip, together</h1>
      <p className="mt-4 max-w-2xl text-lg text-muted">
        Create a shared workspace, invite everyone with a link or code, collect each person's preferences, vote on experiences and see where the group agrees, before building the itinerary.
      </p>
      <div className="mt-10 grid gap-5 md:grid-cols-3">
        <div className="rounded-md border border-line bg-surface p-6">
          <Plus className="size-6 text-brand-2" />
          <h2 className="mt-3 font-sans text-lg font-semibold">Create a new trip</h2>
          <p className="mt-1 text-sm text-muted">Set dates, travellers and a budget. You'll get a shareable invite link.</p>
          <ButtonLink href="/group/new" className="mt-5">Create trip</ButtonLink>
        </div>
        <div className="rounded-md border border-line bg-surface p-6 md:col-span-2">
          <KeyRound className="size-6 text-brand-2" />
          <h2 className="mt-3 font-sans text-lg font-semibold">Have an invite code?</h2>
          <p className="mt-1 text-sm text-muted">Enter the code someone shared with you.</p>
          <JoinByCode />
        </div>
      </div>
      <p className="mt-8 text-sm text-muted">
        Local edition: your identity is a private guest account stored in a cookie on this browser. <a href="/register" className="underline">Create an account</a> to sign in from another browser. Group members see each other's changes on this machine or local network (the workspace refreshes automatically).
      </p>
    </div>
  );
}
