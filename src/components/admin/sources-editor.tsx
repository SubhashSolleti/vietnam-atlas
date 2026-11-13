"use client";

import { ExternalLink, Trash2 } from "lucide-react";
import { useState, useTransition } from "react";
import { addSource, removeVerification, updateVerification } from "@/app/actions/admin";
import { DataStatusBadge } from "@/components/catalog/meta";
import { Button } from "@/components/ui/button";
import { Field, Input, Select } from "@/components/ui/form";
import { useToast } from "@/components/ui/toast";

type S = { id: string; title: string; url: string; publisher: string; kind: string; checked: string; status: string; confidence: string; verifiedAt: string };
const STATUSES = ["verified_official", "verified_provider", "reference", "estimated", "community", "needs_verification", "temporarily_unavailable"] as const;

export function SourcesEditor({ entityType, entityId, sources }: { entityType: "activity" | "destination" | "attraction"; entityId: string; sources: S[] }) {
  const toast = useToast();
  const [pending, start] = useTransition();
  const today = new Date().toISOString().slice(0, 10);
  const blank = { title: "", url: "", publisher: "", kind: "attraction_official", checked: "", status: "needs_verification", confidence: "medium", verifiedAt: today };
  const [v, setV] = useState(blank);
  const [errs, setErrs] = useState<Record<string, string>>({});
  return (
    <section>
      <h2 className="mb-3 text-2xl">Sources &amp; verification</h2>
      {sources.length ? (
        <ul className="divide-y divide-line rounded-md border border-line bg-surface text-sm">
          {sources.map((s) => (
            <li key={s.id} className="flex flex-wrap items-center gap-3 px-4 py-3">
              <div className="min-w-0 flex-1">
                <a href={s.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 font-medium hover:underline">{s.title}<ExternalLink className="size-3" /></a>
                <p className="text-xs text-muted">{s.publisher} · {s.kind.replace(/_/g, " ")} · {s.checked}</p>
              </div>
              <DataStatusBadge status={s.status} />
              <label className="sr-only" htmlFor={`vs-${s.id}`}>Status</label>
              <select id={`vs-${s.id}`} className="field h-8 w-auto text-xs" defaultValue={s.status} onChange={(e) => start(async () => { const r = await updateVerification(s.id, { status: e.target.value as "estimated", verifiedAt: today, confidence: s.confidence as "high" }); toast(r.ok ? { tone: "success", title: "Verification updated (dated today)" } : { tone: "error", title: r.error }); })}>
                {STATUSES.map((x) => <option key={x} value={x}>{x.replace(/_/g, " ")}</option>)}
              </select>
              <span className="text-xs text-muted">Checked {s.verifiedAt}</span>
              <Button size="sm" variant="ghost" className="text-bad" aria-label="Remove source" disabled={pending} onClick={() => start(async () => void (await removeVerification(s.id)))}><Trash2 className="size-4" /></Button>
            </li>
          ))}
        </ul>
      ) : (
        <p className="rounded-md bg-highlight-soft px-4 py-3 text-sm">No sources yet: records can't be published without at least one.</p>
      )}
      <form className="mt-4 grid gap-3 rounded-md border border-line bg-surface p-4 sm:grid-cols-2 lg:grid-cols-4" onSubmit={(e) => { e.preventDefault(); start(async () => { const r = await addSource({ entityType, entityId, ...v, kind: v.kind as "provider", status: v.status as "estimated", confidence: v.confidence as "high" }); if (r.ok) { setV(blank); setErrs({}); toast({ tone: "success", title: "Source added" }); } else { setErrs(r.fieldErrors ?? {}); toast({ tone: "error", title: r.error }); } }); }}>
        <div className="sm:col-span-2"><Field label="Title" name="s-title" error={errs.title}>{(p) => <Input {...p} value={v.title} onChange={(e) => setV({ ...v, title: e.target.value })} />}</Field></div>
        <div className="sm:col-span-2"><Field label="URL" name="s-url" error={errs.url}>{(p) => <Input {...p} type="url" value={v.url} onChange={(e) => setV({ ...v, url: e.target.value })} placeholder="https://" />}</Field></div>
        <Field label="Publisher" name="s-pub" error={errs.publisher}>{(p) => <Input {...p} value={v.publisher} onChange={(e) => setV({ ...v, publisher: e.target.value })} />}</Field>
        <Field label="Kind" name="s-kind">{(p) => <Select {...p} value={v.kind} onChange={(e) => setV({ ...v, kind: e.target.value })}>{["official_tourism", "government", "attraction_official", "national_park", "transport", "provider", "publisher", "reference"].map((k) => <option key={k} value={k}>{k.replace(/_/g, " ")}</option>)}</Select>}</Field>
        <Field label="What was checked" name="s-checked" error={errs.checked}>{(p) => <Input {...p} value={v.checked} onChange={(e) => setV({ ...v, checked: e.target.value })} placeholder="Ticket price" />}</Field>
        <Field label="Status" name="s-status">{(p) => <Select {...p} value={v.status} onChange={(e) => setV({ ...v, status: e.target.value })}>{STATUSES.map((x) => <option key={x} value={x}>{x.replace(/_/g, " ")}</option>)}</Select>}</Field>
        <Field label="Confidence" name="s-conf">{(p) => <Select {...p} value={v.confidence} onChange={(e) => setV({ ...v, confidence: e.target.value })}><option value="high">High</option><option value="medium">Medium</option><option value="low">Low</option></Select>}</Field>
        <Field label="Verification date" name="s-date">{(p) => <Input {...p} type="date" value={v.verifiedAt} onChange={(e) => setV({ ...v, verifiedAt: e.target.value })} />}</Field>
        <div className="flex items-end"><Button type="submit" disabled={pending}>Add source</Button></div>
      </form>
    </section>
  );
}
