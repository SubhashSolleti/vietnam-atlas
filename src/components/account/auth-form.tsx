"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { loginAction, registerAction } from "@/app/actions/account";
import { Button } from "@/components/ui/button";
import { FieldError, Input, Label } from "@/components/ui/form";

export function AuthForm({ mode, next }: { mode: "login" | "register"; next?: string }) {
  const [state, action, pending] = useActionState(mode === "login" ? loginAction : registerAction, null);
  const fe = state && !state.ok ? state.fieldErrors ?? {} : {};
  // React resets a form after its action runs; keep what the person typed (except the password) across errors.
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  return (
    <form action={action} className="mt-8 space-y-4 rounded-md border border-line bg-surface p-6" noValidate>
      <input type="hidden" name="next" value={next ?? ""} />
      {mode === "register" && (
        <div>
          <Label htmlFor="displayName">Your name</Label>
          <Input id="displayName" name="displayName" autoComplete="name" required maxLength={40} aria-invalid={!!fe.displayName} value={displayName} onChange={(e) => setDisplayName(e.target.value)} />
          <FieldError>{fe.displayName}</FieldError>
        </div>
      )}
      <div>
        <Label htmlFor="email">Email</Label>
        <Input id="email" name="email" type="email" autoComplete="email" required aria-invalid={!!fe.email} value={email} onChange={(e) => setEmail(e.target.value)} />
        <FieldError>{fe.email}</FieldError>
      </div>
      <div>
        <Label htmlFor="password">Password</Label>
        <Input id="password" name="password" type="password" autoComplete={mode === "login" ? "current-password" : "new-password"} required minLength={mode === "register" ? 10 : 1} aria-invalid={!!fe.password} />
        {mode === "register" && !fe.password && <p className="mt-1 text-xs text-muted">At least 10 characters.</p>}
        <FieldError>{fe.password}</FieldError>
      </div>
      {state && !state.ok && !Object.keys(fe).length && <p role="alert" className="rounded-sm bg-bad-soft px-3 py-2 text-sm text-bad">{state.error}</p>}
      <Button type="submit" size="lg" className="w-full" disabled={pending}>{pending ? "Please wait…" : mode === "login" ? "Sign in" : "Create account"}</Button>
      <p className="text-center text-sm text-muted">
        {mode === "login" ? <>New here? <Link href="/register" className="font-semibold text-accent">Create an account</Link></> : <>Already have an account? <Link href="/login" className="font-semibold text-accent">Sign in</Link></>}
      </p>
    </form>
  );
}
