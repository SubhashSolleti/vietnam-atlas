"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef } from "react";
import { tripVersion } from "@/app/actions/trips";

/**
 * Local-edition "realtime": polls the trip's version every few seconds and refreshes the
 * server-rendered workspace when another member changes something.
 */
export function LiveRefresh({ tripId, version, intervalMs = 8000 }: { tripId: string; version: string; intervalMs?: number }) {
  const router = useRouter();
  const last = useRef(version);
  last.current = version;
  useEffect(() => {
    let stop = false;
    const tick = async () => {
      if (document.hidden || stop) return;
      const r = await tripVersion(tripId).catch(() => null);
      if (r?.ok && r.version !== last.current) {
        last.current = r.version;
        router.refresh();
      }
    };
    const id = setInterval(tick, intervalMs);
    const onFocus = () => void tick();
    window.addEventListener("focus", onFocus);
    return () => {
      stop = true;
      clearInterval(id);
      window.removeEventListener("focus", onFocus);
    };
  }, [tripId, intervalMs, router]);
  return null;
}
