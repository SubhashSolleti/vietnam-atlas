"use client";

import { useRouter } from "next/navigation";
import { setActiveTrip } from "@/app/actions/trips";

export function TripSwitcher({ trips, activeId, base }: { trips: { id: string; name: string }[]; activeId: string; base: "/group" | "/trip" }) {
  const router = useRouter();
  return (
    <label className="text-xs">
      <span className="sr-only">Switch trip</span>
      <select
        value={activeId}
        className="rounded-sm border border-line bg-surface px-2 py-1 text-xs"
        onChange={async (e) => {
          await setActiveTrip(e.target.value);
          router.push(base === "/group" ? `/group/${e.target.value}` : "/trip");
        }}
      >
        {trips.map((t) => (
          <option key={t.id} value={t.id}>{t.name}</option>
        ))}
      </select>
    </label>
  );
}
