"use client";

import { createContext, useContext, useOptimistic, useTransition, type ReactNode } from "react";
import type { UserState } from "@/services/user-state";

type Optimistic =
  | { type: "save"; key: string; saved: boolean }
  | { type: "compare"; id: string; on: boolean }
  | { type: "candidate"; activityId: string; status: string };

const Ctx = createContext<{
  state: UserState;
  apply: (o: Optimistic, fn: () => Promise<unknown>) => void;
  pending: boolean;
} | null>(null);

function reducer(s: UserState, o: Optimistic): UserState {
  switch (o.type) {
    case "save": {
      const saved = { ...s.saved };
      if (o.saved) saved[o.key] = saved[o.key] ?? { id: "pending", state: "wishlist", note: null, priority: 2 };
      else delete saved[o.key];
      return { ...s, saved };
    }
    case "compare":
      return { ...s, compareIds: o.on ? [...new Set([...s.compareIds, o.id])] : s.compareIds.filter((x) => x !== o.id) };
    case "candidate":
      return { ...s, activeTripCandidates: { ...s.activeTripCandidates, [o.activityId]: o.status } };
  }
}

export function UserStateProvider({ value, children }: { value: UserState; children: ReactNode }) {
  const [state, setOptimistic] = useOptimistic(value, reducer);
  const [pending, start] = useTransition();
  const apply = (o: Optimistic, fn: () => Promise<unknown>) =>
    start(async () => {
      setOptimistic(o);
      await fn();
    });
  return <Ctx.Provider value={{ state, apply, pending }}>{children}</Ctx.Provider>;
}

export function useUserState() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useUserState must be used inside <UserStateProvider>");
  return ctx;
}
