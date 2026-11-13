"use client";

import { Star } from "lucide-react";
import { useTransition } from "react";
import { setPublishStatus, toggleFeatured } from "@/app/actions/admin";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/components/ui/toast";
import { cn } from "@/lib/utils";

export function StatusSelect({ entityType, id, status }: { entityType: "activity" | "destination" | "attraction"; id: string; status: string }) {
  const toast = useToast();
  const [pending, start] = useTransition();
  return (
    <label className="inline-flex items-center gap-2">
      <span className="sr-only">Status</span>
      <select disabled={pending} value={status} className={cn("rounded-sm border border-line bg-surface px-2 py-1 text-xs", status === "published" ? "text-good" : status === "draft" ? "text-warn" : "text-muted")}
        onChange={(e) => start(async () => { const r = await setPublishStatus(entityType, id, e.target.value as "draft"); toast(r.ok ? { tone: "success", title: `Now ${e.target.value}` } : { tone: "error", title: r.error }); })}>
        <option value="draft">Draft</option><option value="published">Published</option><option value="archived">Archived</option>
      </select>
    </label>
  );
}

export function FeaturedToggle({ entityType, id, featured }: { entityType: "activity" | "destination"; id: string; featured: boolean }) {
  const [pending, start] = useTransition();
  return (
    <button type="button" disabled={pending} aria-pressed={featured} aria-label={featured ? "Unfeature" : "Feature"} title="Featured on home/region pages" onClick={() => start(async () => void (await toggleFeatured(entityType, id, !featured)))} className="text-muted hover:text-ink">
      <Star className={cn("size-4", featured && "fill-highlight text-highlight")} />
    </button>
  );
}

export function StatusBadge({ status }: { status: string }) {
  return <Badge tone={status === "published" ? "good" : status === "draft" ? "warn" : "neutral"}>{status}</Badge>;
}
