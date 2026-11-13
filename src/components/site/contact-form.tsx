"use client";

import { useState, useTransition } from "react";
import { submitFeedback } from "@/app/actions/account";
import { Button } from "@/components/ui/button";
import { Field, Input, Select, Textarea } from "@/components/ui/form";

export function ContactForm({ page }: { page?: string }) {
  const [pending, start] = useTransition();
  const [type, setType] = useState<"correction" | "feedback" | "group_report">(page ? "correction" : "feedback");
  const [msg, setMsg] = useState("");
  const [where, setWhere] = useState(page ?? "");
  const [result, setResult] = useState<{ ok: boolean; text: string } | null>(null);
  if (result?.ok) return <p role="status" className="mt-8 rounded-md bg-good-soft p-5 text-good">Thank you: your message has been received and will be reviewed by an editor.</p>;
  return (
    <form className="mt-8 space-y-4 rounded-md border border-line bg-surface p-6" onSubmit={(e) => { e.preventDefault(); start(async () => { const r = await submitFeedback({ type, message: msg, page: where || undefined }); setResult({ ok: r.ok, text: r.ok ? "" : r.error }); }); }}>
      <Field label="Type" name="fb-type">{(f) => <Select {...f} value={type} onChange={(e) => setType(e.target.value as "feedback")}><option value="correction">Correction to content</option><option value="feedback">General feedback</option><option value="group_report">Report a problem with a group</option></Select>}</Field>
      <Field label="Page (optional)" name="fb-page">{(f) => <Input {...f} value={where} onChange={(e) => setWhere(e.target.value)} placeholder="/destinations/hanoi" />}</Field>
      <Field label="Message" name="fb-msg" error={result && !result.ok ? result.text : undefined}>{(f) => <Textarea {...f} rows={6} value={msg} onChange={(e) => setMsg(e.target.value)} minLength={10} maxLength={3000} required />}</Field>
      <Button type="submit" disabled={pending}>{pending ? "Sending…" : "Send"}</Button>
    </form>
  );
}
