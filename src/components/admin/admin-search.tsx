"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";

export function AdminSearch({ destinations }: { destinations?: { id: string; name: string }[] }) {
  const sp = useSearchParams();
  const router = useRouter();
  const path = usePathname();
  const [q, setQ] = useState(sp.get("q") ?? "");
  const set = (k: string, v: string) => {
    const n = new URLSearchParams(sp.toString());
    if (v) n.set(k, v); else n.delete(k);
    n.delete("page");
    router.replace(`${path}?${n}`);
  };
  return (
    <form className="mt-4 flex flex-wrap gap-2" onSubmit={(e) => { e.preventDefault(); set("q", q); }}>
      <label className="sr-only" htmlFor="adm-q">Search</label>
      <input id="adm-q" className="field h-9 max-w-xs" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search…" />
      <label className="sr-only" htmlFor="adm-status">Status</label>
      <select id="adm-status" className="field h-9 w-auto" value={sp.get("status") ?? ""} onChange={(e) => set("status", e.target.value)}>
        <option value="">Any status</option><option value="published">Published</option><option value="draft">Draft</option><option value="archived">Archived</option>
      </select>
      {destinations && (
        <>
          <label className="sr-only" htmlFor="adm-dest">Destination</label>
          <select id="adm-dest" className="field h-9 w-auto" value={sp.get("destination") ?? ""} onChange={(e) => set("destination", e.target.value)}>
            <option value="">All destinations</option>
            {destinations.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
          </select>
        </>
      )}
    </form>
  );
}
