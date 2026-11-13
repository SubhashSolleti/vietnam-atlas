"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";

export function JoinByCode() {
  const [code, setCode] = useState("");
  const router = useRouter();
  return (
    <form
      className="mt-4 flex max-w-md gap-2"
      onSubmit={(e) => {
        e.preventDefault();
        const c = code.trim().toUpperCase();
        if (c) router.push(`/join/${encodeURIComponent(c)}`);
      }}
    >
      <label htmlFor="invite-code" className="sr-only">Invite code</label>
      <input id="invite-code" value={code} onChange={(e) => setCode(e.target.value)} placeholder="e.g. K7Q2M9XD" className="field h-10 uppercase" autoComplete="off" maxLength={16} />
      <Button type="submit" disabled={!code.trim()}>Continue</Button>
    </form>
  );
}
