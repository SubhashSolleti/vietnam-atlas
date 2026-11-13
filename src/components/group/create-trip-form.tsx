"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { createTrip } from "@/app/actions/trips";
import { Button } from "@/components/ui/button";
import { Field, Input, Select, Textarea } from "@/components/ui/form";
import { useToast } from "@/components/ui/toast";

export function CreateTripForm() {
  const router = useRouter();
  const toast = useToast();
  const [pending, start] = useTransition();
  const [errors, setErrors] = useState<Record<string, string>>({});
  return (
    <form
      noValidate
      className="mt-8 space-y-5 rounded-md border border-line bg-surface p-6"
      onSubmit={(e) => {
        e.preventDefault();
        const f = new FormData(e.currentTarget);
        start(async () => {
          const r = await createTrip({
            name: String(f.get("name") ?? ""),
            displayName: String(f.get("displayName") ?? ""),
            startDate: String(f.get("startDate") ?? ""),
            endDate: String(f.get("endDate") ?? ""),
            travellersCount: Number(f.get("travellersCount")),
            budgetTargetInr: f.get("budgetTargetInr") ? Number(f.get("budgetTargetInr")) : undefined,
            currency: String(f.get("currency")) as "INR",
            description: String(f.get("description") ?? ""),
          });
          if (!r.ok) {
            setErrors(r.fieldErrors ?? {});
            // The field shows the specific message; the toast only points to it.
            toast({ tone: "error", title: r.fieldErrors && Object.keys(r.fieldErrors).length ? "Please check the highlighted field." : r.error });
            return;
          }
          toast({ tone: "success", title: "Trip created", description: `Invite code: ${r.inviteCode}` });
          router.push(`/group/${r.tripId}?tab=members`);
        });
      }}
    >
      <Field label="Trip name" name="name" error={errors.name}>{(p) => <Input {...p} required minLength={3} maxLength={80} placeholder="e.g. Vietnam with the cousins" />}</Field>
      <Field label="Your name (as the group will see it)" name="displayName" error={errors.displayName}>{(p) => <Input {...p} required maxLength={40} />}</Field>
      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="Start date" name="startDate" error={errors.startDate}>{(p) => <Input {...p} type="date" required />}</Field>
        <Field label="End date" name="endDate" error={errors.endDate}>{(p) => <Input {...p} type="date" required />}</Field>
      </div>
      <div className="grid gap-5 sm:grid-cols-3">
        <Field label="Travellers" name="travellersCount" error={errors.travellersCount} hint="Including you">{(p) => <Input {...p} type="number" min={1} max={30} defaultValue={2} required />}</Field>
        <Field label="Budget per person (₹)" name="budgetTargetInr" error={errors.budgetTargetInr} hint="Excluding international flights">{(p) => <Input {...p} type="number" min={0} step={1000} placeholder="65000" />}</Field>
        <Field label="Display currency" name="currency">{(p) => <Select {...p} defaultValue="INR"><option value="INR">INR ₹</option><option value="VND">VND ₫</option><option value="USD">USD $</option></Select>}</Field>
      </div>
      <Field label="Description (optional)" name="description" error={errors.description}>{(p) => <Textarea {...p} maxLength={400} rows={3} />}</Field>
      <Button type="submit" size="lg" disabled={pending}>{pending ? "Creating…" : "Create trip"}</Button>
    </form>
  );
}
