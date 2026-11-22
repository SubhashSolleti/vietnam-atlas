import type { Metadata } from "next";
import { CreateTripForm } from "@/components/group/create-trip-form";

export const metadata: Metadata = { title: "Create a trip" };

export default function NewTripPage() {
  return (
    <div className="container-x max-w-2xl pt-12">
      <p className="eyebrow mb-2">Group planner</p>
      <h1 className="text-4xl">Create a trip</h1>
      <p className="mt-3 text-muted">You'll become the trip owner. Share the invite link and everyone joins with just their name, in any order. Attach your itinerary PDF so the group plans on top of it.</p>
      <CreateTripForm />
    </div>
  );
}
