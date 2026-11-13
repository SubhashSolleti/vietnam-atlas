"use client";

import { Crown, Pencil, RefreshCw, Trash2, UserPlus } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { addSeat, deleteTrip, leaveTrip, regenerateInvite, removeMember, updateMember, updateTrip } from "@/app/actions/trips";
import { CopyButton } from "@/components/catalog/actions";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Field, Input, Select, Textarea } from "@/components/ui/form";
import { useConfirm } from "@/components/ui/confirm";
import { useToast } from "@/components/ui/toast";

type M = { id: string; displayName: string; avatarColor: string; role: "owner" | "editor" | "member"; travellerType: "couple" | "solo"; coupleGroup: string | null; joined: boolean; isMe: boolean };
const COLORS = ["#173F35", "#377A61", "#C96F50", "#D6AB59", "#5B6F8F", "#8A5A83", "#6E7B3A", "#3F6E86", "#9A4E3C", "#55705F"];

export function MembersPanel({
  tripId,
  inviteCode,
  myRole,
  members,
  votePrivacy,
  trip,
}: {
  tripId: string;
  inviteCode: string;
  myRole: "owner" | "editor" | "member";
  members: M[];
  votePrivacy: "named" | "anonymous";
  trip: { name: string; startDate: string; endDate: string; budgetTargetInr: number | null; budgetMinInr: number | null; budgetMaxInr: number | null; currency: string; description: string | null };
}) {
  const toast = useToast();
  const router = useRouter();
  const [pending, start] = useTransition();
  const [editing, setEditing] = useState<M | null>(null);
  const [tripOpen, setTripOpen] = useState(false);
  const [newSeat, setNewSeat] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [deleteName, setDeleteName] = useState("");
  const confirm = useConfirm();
  const [origin, setOrigin] = useState("");
  useEffect(() => setOrigin(window.location.origin), []);
  const canManage = myRole === "owner" || myRole === "editor";
  const link = `/join/${inviteCode}`;
  const run = (fn: () => Promise<{ ok: boolean; error?: string }>, ok: string) =>
    start(async () => {
      const r = await fn();
      toast(r.ok ? { tone: "success", title: ok } : { tone: "error", title: (r as { error: string }).error });
    });

  return (
    <div className="grid gap-8 lg:grid-cols-12">
      <section className="lg:col-span-7" aria-labelledby="members-h">
        <h2 id="members-h" className="mb-4 text-2xl">Travellers</h2>
        <ul className="divide-y divide-line rounded-md border border-line bg-surface">
          {members.map((m) => (
            <li key={m.id} className="flex items-center gap-3 px-4 py-3">
              <Avatar name={m.displayName} color={m.avatarColor} size={38} muted={!m.joined} />
              <div className="min-w-0 flex-1">
                <p className="flex flex-wrap items-center gap-1.5 font-medium">
                  {m.displayName}
                  {m.isMe && <Badge tone="brand">You</Badge>}
                  {m.role === "owner" && <Badge tone="accent" icon={<Crown className="size-3" />}>Owner</Badge>}
                  {m.role === "editor" && <Badge>Editor</Badge>}
                </p>
                <p className="text-xs text-muted">
                  {m.joined ? "Joined" : "Seat not claimed yet"} · {m.travellerType === "couple" ? `Couple${m.coupleGroup ? ` ${m.coupleGroup}` : ""}` : "Solo traveller"}
                </p>
              </div>
              {(m.isMe || canManage) && (
                <Button size="sm" variant="ghost" onClick={() => setEditing(m)} aria-label={`Edit ${m.displayName}`}>
                  <Pencil className="size-4" />
                </Button>
              )}
              {myRole === "owner" && m.role !== "owner" && (
                <Button size="sm" variant="ghost" className="text-bad" aria-label={`Remove ${m.displayName}`} disabled={pending}
                  onClick={async () => (await confirm({ title: `Remove ${m.displayName}?`, description: "Their seat, preferences and votes will be deleted from this trip.", confirmLabel: "Remove", tone: "danger" })) && run(() => removeMember(m.id), `${m.displayName} removed`)}>
                  <Trash2 className="size-4" />
                </Button>
              )}
            </li>
          ))}
        </ul>
        {canManage && (
          <form className="mt-3 flex gap-2" onSubmit={(e) => { e.preventDefault(); if (newSeat.trim()) run(async () => { const r = await addSeat(tripId, newSeat); if (r.ok) setNewSeat(""); return r; }, "Seat added"); }}>
            <label htmlFor="new-seat" className="sr-only">New traveller name</label>
            <input id="new-seat" value={newSeat} onChange={(e) => setNewSeat(e.target.value)} placeholder="Add a traveller seat (name)" className="field h-10" maxLength={40} />
            <Button type="submit" variant="outline" disabled={pending || !newSeat.trim()}><UserPlus className="size-4" />Add</Button>
          </form>
        )}
        <div className="mt-6 flex flex-wrap gap-2">
          {myRole !== "owner" && (
            <Button variant="ghost" size="sm" className="text-bad" disabled={pending}
              onClick={async () => (await confirm({ title: "Leave this trip?", description: "Your seat and votes stay with the group, but you will lose access until someone re-invites you.", confirmLabel: "Leave trip", tone: "danger" })) && start(async () => { const r = await leaveTrip(tripId); if (r.ok) router.push("/group"); else toast({ tone: "error", title: r.error }); })}>
              Leave trip
            </Button>
          )}
          {myRole === "owner" && (
            <Button variant="ghost" size="sm" className="text-bad" disabled={pending} onClick={() => { setDeleteName(""); setDeleting(true); }}>
              Delete trip
            </Button>
          )}
        </div>
        {deleting && (
          <Dialog open onClose={() => setDeleting(false)} title="Delete this trip?" size="sm"
            footer={<><Button variant="ghost" onClick={() => setDeleting(false)}>Cancel</Button><Button variant="danger" disabled={pending || deleteName.trim() !== trip.name.trim()} onClick={() => start(async () => { const r = await deleteTrip(tripId, deleteName); if (r.ok) router.push("/group"); else toast({ tone: "error", title: r.error }); })}>Delete permanently</Button></>}>
            <p className="text-sm text-muted">This removes the plan, votes, comments, budget and invite link for everyone. It can't be undone.</p>
            <Field label={`Type “${trip.name}” to confirm`} name="delete-trip-name" className="mt-4">{(p) => <Input {...p} value={deleteName} onChange={(e) => setDeleteName(e.target.value)} autoComplete="off" />}</Field>
          </Dialog>
        )}
      </section>

      <aside className="space-y-5 lg:col-span-5">
        <div className="rounded-md border border-line bg-surface p-5">
          <h2 className="font-sans text-base font-semibold">Invite your group</h2>
          <p className="mt-1 text-sm text-muted">Anyone with this link or code can join and claim an open seat.</p>
          <div className="mt-4 flex items-center gap-2">
            <code className="flex-1 truncate rounded-sm bg-surface-2 px-3 py-2 text-sm">{origin}{link}</code>
            <CopyButton value={link} label="Copy link" />
          </div>
          <div className="mt-3 flex items-center justify-between rounded-sm border border-dashed border-line-strong px-3 py-2">
            <span className="text-sm">Code <strong className="tracking-widest">{inviteCode}</strong></span>
            <CopyButton value={inviteCode} label="Copy" />
          </div>
          {myRole === "owner" && (
            <Button variant="ghost" size="sm" className="mt-3" disabled={pending}
              onClick={async () => (await confirm({ title: "Generate a new invite code?", description: "The old link and code will stop working immediately.", confirmLabel: "Regenerate" })) && run(() => regenerateInvite(tripId), "New invite code generated")}>
              <RefreshCw className="size-4" /> Regenerate code
            </Button>
          )}
        </div>
        {canManage && (
          <div className="rounded-md border border-line bg-surface p-5">
            <h2 className="font-sans text-base font-semibold">Trip settings</h2>
            <p className="mt-1 text-sm text-muted">Dates, budget, currency and voting privacy.</p>
            <dl className="mt-3 grid grid-cols-2 gap-2 text-sm">
              <dt className="text-muted">Voting</dt><dd>{votePrivacy === "named" ? "Names visible" : "Anonymous tallies"}</dd>
              <dt className="text-muted">Currency</dt><dd>{trip.currency}</dd>
            </dl>
            <Button variant="outline" size="sm" className="mt-4" onClick={() => setTripOpen(true)}>Edit trip settings</Button>
          </div>
        )}
      </aside>

      {editing && (
        <MemberDialog m={editing} canChangeRole={myRole === "owner" && !editing.isMe} onClose={() => setEditing(null)}
          onSave={(v) => run(async () => { const r = await updateMember(editing.id, v); if (r.ok) setEditing(null); return r; }, "Traveller updated")} pending={pending} />
      )}
      {tripOpen && (
        <TripDialog trip={trip} votePrivacy={votePrivacy} pending={pending} onClose={() => setTripOpen(false)}
          onSave={(v) => run(async () => { const r = await updateTrip(tripId, v); if (r.ok) setTripOpen(false); return r; }, "Trip updated")} />
      )}
    </div>
  );
}

function MemberDialog({ m, canChangeRole, onClose, onSave, pending }: { m: M; canChangeRole: boolean; onClose: () => void; onSave: (v: Parameters<typeof updateMember>[1]) => void; pending: boolean }) {
  const [name, setName] = useState(m.displayName);
  const [color, setColor] = useState(m.avatarColor);
  const [type, setType] = useState(m.travellerType);
  const [couple, setCouple] = useState(m.coupleGroup ?? "");
  const [role, setRole] = useState(m.role);
  return (
    <Dialog open onClose={onClose} title={`Edit ${m.displayName}`} size="sm"
      footer={<><Button variant="ghost" onClick={onClose}>Cancel</Button><Button disabled={pending} onClick={() => onSave({ displayName: name, avatarColor: color, travellerType: type, coupleGroup: type === "couple" ? couple || null : null, ...(canChangeRole && role !== m.role ? { role } : {}) })}>Save</Button></>}>
      <div className="space-y-4">
        <Field label="Display name" name="m-name">{(p) => <Input {...p} value={name} onChange={(e) => setName(e.target.value)} maxLength={40} />}</Field>
        <fieldset>
          <legend className="mb-1.5 text-sm font-medium">Avatar colour</legend>
          <div className="flex flex-wrap gap-2">
            {COLORS.map((c) => (
              <label key={c} className="cursor-pointer">
                <input type="radio" name="color" className="peer sr-only" checked={color === c} onChange={() => setColor(c)} />
                <span className="block size-8 rounded-full ring-offset-2 ring-offset-surface peer-checked:ring-2 peer-checked:ring-ink peer-focus-visible:ring-2 peer-focus-visible:ring-accent" style={{ background: c }} />
                <span className="sr-only">{c}</span>
              </label>
            ))}
          </div>
        </fieldset>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Travelling as" name="m-type">{(p) => <Select {...p} value={type} onChange={(e) => setType(e.target.value as "couple" | "solo")}><option value="solo">Solo</option><option value="couple">Part of a couple</option></Select>}</Field>
          {type === "couple" && <Field label="Couple group" name="m-couple" hint="Same letter for both partners">{(p) => <Input {...p} value={couple} onChange={(e) => setCouple(e.target.value.toUpperCase())} maxLength={12} placeholder="A" />}</Field>}
        </div>
        {canChangeRole && (
          <Field label="Role" name="m-role" hint="Editors can manage the shortlist, budget and itinerary. Making someone owner transfers ownership.">
            {(p) => <Select {...p} value={role} onChange={(e) => setRole(e.target.value as M["role"])} disabled={!m.joined && role !== m.role}><option value="member">Member</option><option value="editor">Editor</option>{m.joined && <option value="owner">Owner (transfer)</option>}</Select>}
          </Field>
        )}
      </div>
    </Dialog>
  );
}

function TripDialog({ trip, votePrivacy, onClose, onSave, pending }: { trip: { name: string; startDate: string; endDate: string; budgetTargetInr: number | null; budgetMinInr: number | null; budgetMaxInr: number | null; currency: string; description: string | null }; votePrivacy: "named" | "anonymous"; onClose: () => void; onSave: (v: Parameters<typeof updateTrip>[1]) => void; pending: boolean }) {
  const [v, setV] = useState({ ...trip, votePrivacy, description: trip.description ?? "" });
  return (
    <Dialog open onClose={onClose} title="Trip settings" size="md"
      footer={<><Button variant="ghost" onClick={onClose}>Cancel</Button><Button disabled={pending} onClick={() => onSave({ name: v.name, startDate: v.startDate, endDate: v.endDate, budgetTargetInr: v.budgetTargetInr, budgetMinInr: v.budgetMinInr, budgetMaxInr: v.budgetMaxInr, currency: v.currency as "INR", votePrivacy: v.votePrivacy, description: v.description })}>Save changes</Button></>}>
      <div className="space-y-4">
        <Field label="Trip name" name="t-name">{(p) => <Input {...p} value={v.name} onChange={(e) => setV({ ...v, name: e.target.value })} />}</Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Start" name="t-start">{(p) => <Input {...p} type="date" value={v.startDate} onChange={(e) => setV({ ...v, startDate: e.target.value })} />}</Field>
          <Field label="End" name="t-end">{(p) => <Input {...p} type="date" value={v.endDate} onChange={(e) => setV({ ...v, endDate: e.target.value })} />}</Field>
        </div>
        <p className="text-xs text-muted">Changing dates adds new empty days; days that already have plans are kept.</p>
        <div className="grid grid-cols-3 gap-3">
          <Field label="Min ₹/person" name="t-min">{(p) => <Input {...p} type="number" value={v.budgetMinInr ?? ""} onChange={(e) => setV({ ...v, budgetMinInr: e.target.value ? Number(e.target.value) : null })} />}</Field>
          <Field label="Target ₹/person" name="t-target">{(p) => <Input {...p} type="number" value={v.budgetTargetInr ?? ""} onChange={(e) => setV({ ...v, budgetTargetInr: e.target.value ? Number(e.target.value) : null })} />}</Field>
          <Field label="Max ₹/person" name="t-max">{(p) => <Input {...p} type="number" value={v.budgetMaxInr ?? ""} onChange={(e) => setV({ ...v, budgetMaxInr: e.target.value ? Number(e.target.value) : null })} />}</Field>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Currency" name="t-cur">{(p) => <Select {...p} value={v.currency} onChange={(e) => setV({ ...v, currency: e.target.value })}><option>INR</option><option>VND</option><option>USD</option></Select>}</Field>
          <Field label="Voting privacy" name="t-priv">{(p) => <Select {...p} value={v.votePrivacy} onChange={(e) => setV({ ...v, votePrivacy: e.target.value as "named" })}><option value="named">Show who voted what</option><option value="anonymous">Anonymous tallies only</option></Select>}</Field>
        </div>
        <Field label="Description" name="t-desc">{(p) => <Textarea {...p} value={v.description} onChange={(e) => setV({ ...v, description: e.target.value })} rows={3} />}</Field>
      </div>
    </Dialog>
  );
}
