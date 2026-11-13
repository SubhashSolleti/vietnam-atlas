"use client";

import { BellRing, Check, Pencil, Plus, Trash2 } from "lucide-react";
import { useState, useTransition } from "react";
import { deleteContact, saveContact, saveNetworkingProfile } from "@/app/actions/account";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useConfirm } from "@/components/ui/confirm";
import { Dialog } from "@/components/ui/dialog";
import { Field, Input, Textarea } from "@/components/ui/form";
import { useToast } from "@/components/ui/toast";
import { formatLongDate } from "@/lib/utils";

type Contact = { id: string; name: string; company: string | null; role: string | null; metAt: string | null; notes: string | null; followUpDate: string | null; followedUp: boolean };

export function NetworkingPrep({ profile, contacts, today }: { profile: { headline: string; introduction: string; linkedinUrl: string; interests: string[] }; contacts: Contact[]; today: string }) {
  const toast = useToast();
  const confirm = useConfirm();
  const [pending, start] = useTransition();
  const [p, setP] = useState({ ...profile, interests: profile.interests.join(", ") });
  const [err, setErr] = useState<Record<string, string>>({});
  const [editing, setEditing] = useState<Contact | "new" | null>(null);
  const due = contacts.filter((c) => c.followUpDate && !c.followedUp && c.followUpDate <= today);
  return (
    <div className="mt-5 grid gap-8 lg:grid-cols-2">
      <form className="space-y-4 rounded-md border border-line bg-surface p-5" onSubmit={(e) => { e.preventDefault(); start(async () => { const r = await saveNetworkingProfile({ headline: p.headline, introduction: p.introduction, linkedinUrl: p.linkedinUrl, interests: p.interests.split(",").map((x) => x.trim()).filter(Boolean) }); setErr(r.ok ? {} : r.fieldErrors ?? {}); toast(r.ok ? { tone: "success", title: "Introduction saved" } : { tone: "error", title: r.error }); }); }}>
        <h3 className="font-sans text-base font-semibold">Personal introduction</h3>
        <Field label="Headline" name="n-head">{(f) => <Input {...f} value={p.headline} onChange={(e) => setP({ ...p, headline: e.target.value })} maxLength={120} placeholder="e.g. Backend engineer · cloud & AI · Hyderabad" />}</Field>
        <Field label="Short introduction" name="n-intro" hint="A 30-second pitch you can paste into meetup chats">{(f) => <Textarea {...f} rows={4} value={p.introduction} onChange={(e) => setP({ ...p, introduction: e.target.value })} maxLength={1500} />}</Field>
        <Field label="LinkedIn profile URL" name="linkedinUrl" error={err.linkedinUrl}>{(f) => <Input {...f} type="url" value={p.linkedinUrl} onChange={(e) => setP({ ...p, linkedinUrl: e.target.value })} placeholder="https://www.linkedin.com/in/…" />}</Field>
        <Field label="Interests (comma separated)" name="n-int">{(f) => <Input {...f} value={p.interests} onChange={(e) => setP({ ...p, interests: e.target.value })} placeholder="AI agents, Kubernetes, startups" />}</Field>
        <Button type="submit" disabled={pending}>Save introduction</Button>
      </form>
      <div>
        <div className="mb-3 flex items-center justify-between">
          <h3 className="font-sans text-base font-semibold">Contacts &amp; follow-ups</h3>
          <Button size="sm" onClick={() => setEditing("new")}><Plus className="size-4" />Add contact</Button>
        </div>
        {due.length > 0 && <p className="mb-3 flex items-center gap-2 rounded-sm bg-accent-soft px-3 py-2 text-sm"><BellRing className="size-4 text-accent" />{due.length} follow-up{due.length > 1 ? "s" : ""} due</p>}
        {contacts.length ? (
          <ul className="divide-y divide-line rounded-md border border-line bg-surface">
            {contacts.map((c) => (
              <li key={c.id} className="flex items-start gap-3 px-4 py-3 text-sm">
                <div className="min-w-0 flex-1">
                  <p className="font-medium">{c.name}{c.role || c.company ? <span className="font-normal text-muted"> · {[c.role, c.company].filter(Boolean).join(", ")}</span> : null}</p>
                  {c.metAt && <p className="text-xs text-muted">Met at {c.metAt}</p>}
                  {c.notes && <p className="mt-1 line-clamp-2 text-xs">{c.notes}</p>}
                  {c.followUpDate && <p className="mt-1">{c.followedUp ? <Badge tone="good">Followed up</Badge> : <Badge tone={c.followUpDate <= today ? "accent" : "neutral"}>Follow up {formatLongDate(c.followUpDate)}</Badge>}</p>}
                </div>
                {c.followUpDate && !c.followedUp && <Button size="sm" variant="ghost" aria-label={`Mark ${c.name} followed up`} onClick={() => start(async () => void (await saveContact(c.id, { ...c, followedUp: true })))}><Check className="size-4" /></Button>}
                <Button size="sm" variant="ghost" aria-label={`Edit ${c.name}`} onClick={() => setEditing(c)}><Pencil className="size-4" /></Button>
                <Button size="sm" variant="ghost" className="text-bad" aria-label={`Delete ${c.name}`} onClick={async () => (await confirm({ title: `Delete ${c.name}?`, confirmLabel: "Delete", tone: "danger" })) && start(async () => void (await deleteContact(c.id)))}><Trash2 className="size-4" /></Button>
              </li>
            ))}
          </ul>
        ) : (
          <p className="rounded-md border border-dashed border-line-strong p-6 text-center text-sm text-muted">No contacts yet. Add people you meet so you remember to follow up after the trip.</p>
        )}
      </div>
      {editing && <ContactDialog contact={editing === "new" ? null : editing} onClose={() => setEditing(null)} />}
    </div>
  );
}

function ContactDialog({ contact, onClose }: { contact: Contact | null; onClose: () => void }) {
  const toast = useToast();
  const [pending, start] = useTransition();
  const [v, setV] = useState({ name: contact?.name ?? "", company: contact?.company ?? "", role: contact?.role ?? "", metAt: contact?.metAt ?? "", notes: contact?.notes ?? "", followUpDate: contact?.followUpDate ?? "" });
  return (
    <Dialog open onClose={onClose} title={contact ? "Edit contact" : "Add contact"} size="md"
      footer={<><Button variant="ghost" onClick={onClose}>Cancel</Button><Button disabled={pending || !v.name.trim()} onClick={() => start(async () => { const r = await saveContact(contact?.id ?? null, { ...v, company: v.company || null, role: v.role || null, metAt: v.metAt || null, notes: v.notes || null, followUpDate: v.followUpDate || null }); toast(r.ok ? { tone: "success", title: "Contact saved" } : { tone: "error", title: r.error }); if (r.ok) onClose(); })}>Save</Button></>}>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Name" name="c-name">{(f) => <Input {...f} value={v.name} onChange={(e) => setV({ ...v, name: e.target.value })} required />}</Field>
        <Field label="Company" name="c-co">{(f) => <Input {...f} value={v.company} onChange={(e) => setV({ ...v, company: e.target.value })} />}</Field>
        <Field label="Role" name="c-role">{(f) => <Input {...f} value={v.role} onChange={(e) => setV({ ...v, role: e.target.value })} />}</Field>
        <Field label="Where you met" name="c-met">{(f) => <Input {...f} value={v.metAt} onChange={(e) => setV({ ...v, metAt: e.target.value })} placeholder="e.g. GDG meetup, HCMC" />}</Field>
        <Field label="Follow-up reminder" name="c-fu">{(f) => <Input {...f} type="date" value={v.followUpDate} onChange={(e) => setV({ ...v, followUpDate: e.target.value })} />}</Field>
        <div className="sm:col-span-2"><Field label="Meeting notes" name="c-notes">{(f) => <Textarea {...f} rows={3} value={v.notes} onChange={(e) => setV({ ...v, notes: e.target.value })} />}</Field></div>
      </div>
    </Dialog>
  );
}
