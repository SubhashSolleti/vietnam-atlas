"use client";

import { useState, useTransition } from "react";
import { setUserDisabled, setUserRole } from "@/app/actions/admin";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";

type U = { id: string; name: string; email: string | null; role: string; isGuest: boolean; disabled: boolean; createdAt: string };

export function UsersAdmin({ users }: { users: U[] }) {
  const toast = useToast();
  const [pending, start] = useTransition();
  const [showGuests, setShowGuests] = useState(false);
  const list = users.filter((u) => showGuests || !u.isGuest);
  const run = (fn: () => Promise<{ ok: boolean; error?: string }>) => start(async () => { const r = await fn(); if (!r.ok) toast({ tone: "error", title: (r as { error: string }).error }); });
  return (
    <div className="mt-6">
      <label className="flex items-center gap-2 text-sm"><input type="checkbox" className="size-4 accent-[var(--brand)]" checked={showGuests} onChange={(e) => setShowGuests(e.target.checked)} />Show guest profiles ({users.filter((u) => u.isGuest).length})</label>
      <div className="mt-3 relative overflow-x-auto rounded-md border border-line">
        <table className="w-full min-w-[640px] text-sm">
          <thead className="bg-surface-2 text-left text-xs text-muted"><tr><th className="px-3 py-2">Name</th><th className="px-3 py-2">Email</th><th className="px-3 py-2">Role</th><th className="px-3 py-2">Created</th><th className="px-3 py-2" /></tr></thead>
          <tbody className="divide-y divide-line bg-surface">
            {list.map((u) => (
              <tr key={u.id}>
                <td className="px-3 py-2">{u.name} {u.isGuest && <Badge>guest</Badge>} {u.disabled && <Badge tone="bad">disabled</Badge>}</td>
                <td className="px-3 py-2 text-muted">{u.email ?? "-"}</td>
                <td className="px-3 py-2">
                  <select aria-label={`Role for ${u.name}`} className="field h-8 w-auto text-xs" disabled={pending || u.isGuest} value={u.role} onChange={(e) => run(() => setUserRole(u.id, e.target.value as "member"))}>
                    <option value="visitor">Visitor</option><option value="member">Member</option><option value="content_editor">Content editor</option><option value="super_admin">Super admin</option>
                  </select>
                </td>
                <td className="px-3 py-2 text-xs text-muted">{u.createdAt.slice(0, 10)}</td>
                <td className="px-3 py-2"><Button size="xs" variant="ghost" disabled={pending} onClick={() => run(() => setUserDisabled(u.id, !u.disabled))}>{u.disabled ? "Enable" : "Disable"}</Button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
