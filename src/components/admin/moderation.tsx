"use client";

import { useTransition } from "react";
import { moderateReview, setFeedbackStatus } from "@/app/actions/admin";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export function FeedbackRow({ f }: { f: { id: string; type: string; page: string | null; message: string; status: string; createdAt: string } }) {
  const [pending, start] = useTransition();
  return (
    <li className="flex flex-wrap items-start gap-3 px-4 py-3">
      <div className="min-w-0 flex-1">
        <p className="flex flex-wrap items-center gap-2"><Badge tone={f.type === "correction" ? "accent" : f.type === "group_report" ? "bad" : "neutral"}>{f.type.replace("_", " ")}</Badge><span className="text-xs text-muted">{f.createdAt.slice(0, 10)}{f.page ? ` · ${f.page}` : ""}</span></p>
        <p className="mt-1 whitespace-pre-wrap">{f.message}</p>
      </div>
      <Badge tone={f.status === "open" ? "warn" : "neutral"}>{f.status}</Badge>
      {f.status === "open" && (
        <>
          <Button size="xs" variant="outline" disabled={pending} onClick={() => start(async () => void (await setFeedbackStatus(f.id, "resolved")))}>Resolve</Button>
          <Button size="xs" variant="ghost" disabled={pending} onClick={() => start(async () => void (await setFeedbackStatus(f.id, "dismissed")))}>Dismiss</Button>
        </>
      )}
    </li>
  );
}

export function ReviewRow({ r, activity }: { r: { id: string; rating: number; body: string; status: string; createdAt: string }; activity: React.ReactNode }) {
  const [pending, start] = useTransition();
  return (
    <li className="flex flex-wrap items-start gap-3 px-4 py-3">
      <div className="min-w-0 flex-1">
        <p className="text-xs text-muted">{"★".repeat(r.rating)} · {activity} · {r.createdAt.slice(0, 10)}</p>
        <p className="mt-1">{r.body}</p>
      </div>
      <Badge tone={r.status === "published" ? "good" : r.status === "pending" ? "warn" : "neutral"}>{r.status}</Badge>
      <Button size="xs" variant="outline" disabled={pending || r.status === "published"} onClick={() => start(async () => void (await moderateReview(r.id, "published")))}>Publish</Button>
      <Button size="xs" variant="ghost" disabled={pending || r.status === "rejected"} onClick={() => start(async () => void (await moderateReview(r.id, "rejected")))}>Reject</Button>
    </li>
  );
}
