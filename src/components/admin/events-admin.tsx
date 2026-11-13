"use client";

import { Pencil, Plus } from "lucide-react";
import { useState, useTransition } from "react";
import { saveEvent, setOrganiserStatus } from "@/app/actions/admin";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Field, Input, Select, Textarea } from "@/components/ui/form";
import { useToast } from "@/components/ui/toast";
import type { t } from "@/db/client";

type E = typeof t.professionalEvents.$inferSelect;

export function EventsAdmin({ events, orgs }: { events: E[]; orgs: { id: string; name: string; city: string; status: string; publishStatus: string }[] }) {
  const [editing, setEditing] = useState<E | "new" | null>(null);
  const [, start] = useTransition();
  return (
    <div className="mt-6 space-y-10">
      <section>
        <div className="mb-3 flex items-center justify-between"><h2 className="text-2xl">Dated events</h2><Button onClick={() => setEditing("new")}><Plus className="size-4" />Add event</Button></div>
        <ul className="divide-y divide-line rounded-md border border-line bg-surface text-sm">
          {events.map((e) => (
            <li key={e.id} className="flex flex-wrap items-center gap-3 px-4 py-3">
              <span className="min-w-0 flex-1"><strong>{e.name}</strong> <span className="text-muted">· {e.city} · {e.startDate} · verified {e.lastVerified} · {e.publishStatus}</span></span>
              <Button size="sm" variant="ghost" onClick={() => setEditing(e)} aria-label={`Edit ${e.name}`}><Pencil className="size-4" /></Button>
            </li>
          ))}
          {!events.length && <li className="px-4 py-6 text-center text-muted">No events.</li>}
        </ul>
      </section>
      <section>
        <h2 className="mb-3 text-2xl">Communities &amp; organisers</h2>
        <ul className="divide-y divide-line rounded-md border border-line bg-surface text-sm">
          {orgs.map((o) => (
            <li key={o.id} className="flex items-center gap-3 px-4 py-2.5">
              <span className="flex-1">{o.name} <span className="text-xs text-muted">· {o.city} · data {o.status.replace(/_/g, " ")}</span></span>
              <select aria-label={`Status of ${o.name}`} defaultValue={o.publishStatus} className="field h-8 w-auto text-xs" onChange={(e) => start(async () => void (await setOrganiserStatus(o.id, e.target.value as "draft")))}>
                <option value="published">Published</option><option value="draft">Draft</option><option value="archived">Archived</option>
              </select>
            </li>
          ))}
        </ul>
      </section>
      {editing && <EventDialog e={editing === "new" ? null : editing} onClose={() => setEditing(null)} />}
    </div>
  );
}

function EventDialog({ e, onClose }: { e: E | null; onClose: () => void }) {
  const toast = useToast();
  const [pending, start] = useTransition();
  const [errs, setErrs] = useState<Record<string, string>>({});
  const [v, setV] = useState({ name: e?.name ?? "", type: e?.type ?? "developer_meetup", city: e?.city ?? "hanoi", startDate: e?.startDate ?? "", endDate: e?.endDate ?? "", venue: e?.venue ?? "", price: e?.price ?? "", registrationUrl: e?.registrationUrl ?? "", description: e?.description ?? "", organiser: e?.organiser ?? "", lastVerified: e?.lastVerified ?? new Date().toISOString().slice(0, 10), publishStatus: e?.publishStatus ?? "published" });
  const set = (k: keyof typeof v) => (x: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => setV({ ...v, [k]: x.target.value });
  return (
    <Dialog open onClose={onClose} title={e ? "Edit event" : "Add event"} size="lg"
      footer={<><Button variant="ghost" onClick={onClose}>Cancel</Button><Button disabled={pending} onClick={() => start(async () => { const r = await saveEvent(e?.id ?? null, { ...v, city: v.city as "hanoi", publishStatus: v.publishStatus as "draft" }); if (!r.ok) { setErrs(r.fieldErrors ?? {}); toast({ tone: "error", title: r.error }); } else { toast({ tone: "success", title: "Event saved" }); onClose(); } })}>Save</Button></>}>
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="sm:col-span-2"><Field label="Event name" name="ev-name" error={errs.name}>{(p) => <Input {...p} value={v.name} onChange={set("name")} />}</Field></div>
        <Field label="City" name="ev-city">{(p) => <Select {...p} value={v.city} onChange={set("city")}><option value="hanoi">Hanoi</option><option value="ho-chi-minh-city">Ho Chi Minh City</option><option value="da-nang">Da Nang</option><option value="nationwide">Nationwide</option></Select>}</Field>
        <Field label="Type" name="ev-type">{(p) => <Input {...p} value={v.type} onChange={set("type")} />}</Field>
        <Field label="Start date" name="ev-start" error={errs.startDate}>{(p) => <Input {...p} type="date" value={v.startDate} onChange={set("startDate")} />}</Field>
        <Field label="End date" name="ev-end">{(p) => <Input {...p} type="date" value={v.endDate} onChange={set("endDate")} />}</Field>
        <Field label="Venue" name="ev-venue" error={errs.venue}>{(p) => <Input {...p} value={v.venue} onChange={set("venue")} />}</Field>
        <Field label="Price" name="ev-price" error={errs.price}>{(p) => <Input {...p} value={v.price} onChange={set("price")} />}</Field>
        <div className="sm:col-span-2"><Field label="Registration / listing URL" name="ev-url" error={errs.registrationUrl}>{(p) => <Input {...p} type="url" value={v.registrationUrl} onChange={set("registrationUrl")} />}</Field></div>
        <Field label="Organiser" name="ev-org" error={errs.organiser}>{(p) => <Input {...p} value={v.organiser} onChange={set("organiser")} />}</Field>
        <Field label="Last verified" name="ev-ver">{(p) => <Input {...p} type="date" value={v.lastVerified} onChange={set("lastVerified")} />}</Field>
        <div className="sm:col-span-2"><Field label="Description" name="ev-desc" error={errs.description}>{(p) => <Textarea {...p} rows={3} value={v.description} onChange={set("description")} />}</Field></div>
        <Field label="Status" name="ev-status">{(p) => <Select {...p} value={v.publishStatus} onChange={set("publishStatus")}><option value="published">Published</option><option value="draft">Draft</option><option value="archived">Archived</option></Select>}</Field>
      </div>
    </Dialog>
  );
}
