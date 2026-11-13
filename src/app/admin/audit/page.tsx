import { desc } from "drizzle-orm";
import { db, t } from "@/db/client";
import { requireAdminPage } from "@/lib/auth";

export default async function AuditLog() {
  await requireAdminPage(undefined, "/admin/audit");
  const rows = db.select().from(t.adminAuditLogs).orderBy(desc(t.adminAuditLogs.createdAt)).limit(300).all();
  return (
    <div>
      <h1 className="text-3xl">Audit log</h1>
      <p className="mt-2 text-sm text-muted">Every content, settings and user change made through the admin area (latest 300).</p>
      <div className="mt-6 relative overflow-x-auto rounded-md border border-line">
        <table className="w-full min-w-[720px] text-sm">
          <thead className="bg-surface-2 text-left text-xs text-muted"><tr><th className="px-3 py-2">When</th><th className="px-3 py-2">Who</th><th className="px-3 py-2">Action</th><th className="px-3 py-2">Entity</th><th className="px-3 py-2">Summary</th></tr></thead>
          <tbody className="divide-y divide-line bg-surface">
            {rows.map((r) => (
              <tr key={r.id}><td className="px-3 py-2 text-xs whitespace-nowrap text-muted">{r.createdAt.slice(0, 19).replace("T", " ")}</td><td className="px-3 py-2">{r.actorName}</td><td className="px-3 py-2">{r.action}</td><td className="px-3 py-2 text-xs text-muted">{r.entityType}</td><td className="px-3 py-2">{r.summary}</td></tr>
            ))}
            {!rows.length && <tr><td colSpan={5} className="px-3 py-6 text-center text-muted">No changes recorded yet.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}
