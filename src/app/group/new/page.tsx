import type { Metadata } from "next";
import { CreateTripForm } from "@/components/group/create-trip-form";

export const metadata: Metadata = { title: "Create a trip" };

export default function NewTripPage() {
  return (
    <div className="container-x max-w-2xl pt-12">
      <p className="eyebrow mb-2">Group planner</p>
      <h1 className="text-4xl">Create a trip</h1>
      <p className="mt-3 text-muted">You'll become the trip owner. Every traveller gets a seat they can claim with the invite link; you can rename seats and change everything later.</p>
      <CreateTripForm />
    </div>
  );
}
