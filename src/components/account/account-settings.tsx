"use client";

import { Download } from "lucide-react";
import { useState, useTransition } from "react";
import { deleteAccount, updateAccount } from "@/app/actions/account";
import { Button, ButtonLink } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/form";
import { useToast } from "@/components/ui/toast";

export function AccountSettings({ displayName, avatarColor, isGuest }: { displayName: string; avatarColor: string; isGuest: boolean }) {
  const toast = useToast();
  const [pending, start] = useTransition();
  const [name, setName] = useState(displayName);
  const [confirmText, setConfirmText] = useState("");
  const [err, setErr] = useState<string>();
  return (
    <div className="mt-8 space-y-8">
      <form className="space-y-4 rounded-md border border-line bg-surface p-5" onSubmit={(e) => { e.preventDefault(); start(async () => { const r = await updateAccount({ displayName: name }); toast(r.ok ? { tone: "success", title: "Profile updated" } : { tone: "error", title: r.error }); }); }}>
        <h2 className="font-sans text-base font-semibold">Profile</h2>
        <Field label="Display name" name="a-name">{(f) => <Input {...f} value={name} onChange={(e) => setName(e.target.value)} maxLength={40} />}</Field>
        <input type="hidden" value={avatarColor} readOnly />
        <Button type="submit" disabled={pending}>Save</Button>
      </form>
      <section className="rounded-md border border-line bg-surface p-5">
        <h2 className="font-sans text-base font-semibold">Your data</h2>
        <p className="mt-1 text-sm text-muted">Download everything Vietnam Atlas stores about you: wishlist, votes, comments, preferences, checklist progress and networking contacts.</p>
        <ButtonLink href="/api/account/export" variant="outline" className="mt-4" prefetch={false}><Download className="size-4" />Export my data (JSON)</ButtonLink>
      </section>
      <section className="rounded-md border border-bad/40 bg-surface p-5">
        <h2 className="font-sans text-base font-semibold text-bad">Delete account</h2>
        <p className="mt-1 text-sm text-muted">Permanently deletes your {isGuest ? "guest profile" : "account"} and personal data. Your seats in group trips are released so the group's history stays intact; your votes on those seats are kept anonymously with the seat.</p>
        <div className="mt-4 flex flex-wrap items-end gap-2">
          <Field label='Type "DELETE" to confirm' name="a-del" error={err}>{(f) => <Input {...f} value={confirmText} onChange={(e) => setConfirmText(e.target.value)} className="w-48" />}</Field>
          <Button variant="danger" disabled={pending || confirmText !== "DELETE"} onClick={() => start(async () => { const r = await deleteAccount(confirmText); if (r && !r.ok) setErr(r.error); })}>Delete permanently</Button>
        </div>
      </section>
    </div>
  );
}
