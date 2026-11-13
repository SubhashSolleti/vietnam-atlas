"use client";

import { X } from "lucide-react";
import { useTransition } from "react";
import { clearCompare, toggleCompare } from "@/app/actions/wishlist";
import { Button } from "@/components/ui/button";

export function CompareRemove({ activityId }: { activityId: string }) {
  const [pending, start] = useTransition();
  return (
    <Button size="xs" variant="ghost" disabled={pending} onClick={() => start(async () => void (await toggleCompare(activityId, false)))}>
      <X className="size-3.5" /> Remove
    </Button>
  );
}

export function ClearCompare() {
  const [pending, start] = useTransition();
  return (
    <Button variant="outline" size="sm" disabled={pending} onClick={() => start(async () => void (await clearCompare()))}>
      Clear comparison
    </Button>
  );
}
