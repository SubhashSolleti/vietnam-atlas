import Link from "next/link";
import { desc, eq, sql } from "drizzle-orm";
import { db, t } from "@/db/client";
import { formatLongDate } from "@/lib/utils";
import { requireAdminPage } from "@/lib/auth";

export default async function AdminDashboard() {
  await requireAdminPage(undefined, "/admin");
  const count = async (table: typeof t.activities | typeof t.destinations | typeof t.attractions, status: "draft" | "published" | "archived") =>
    (await db.select({ n: sql<number>`count(*)::int` }).from(table).where(eq(table.status, status)).get())!.n;
  const stats = [
    { label: "Destinations", href: "/admin/destinations", pub: await count(t.destinations, "published"), draft: await count(t.destinations, "draft") },
    { label: "Attractions", href: "/admin/attractions", pub: await count(t.attractions, "published"), draft: await count(t.attractions, "draft") },
    { label: "Activities", href: "/admin/activities", pub: await count(t.activities, "published"), draft: await count(t.activities, "draft") },
  ];
  const needsVerification = (await db.select({ n: sql<number>`count(*)::int` }).from(t.sourceVerifications).where(eq(t.sourceVerifications.status, "needs_verification")).get())!.n;
  const estimatedPrices = (await db.select({ n: sql<number>`count(*)::int` }).from(t.activityPrices).where(sql`${t.activityPrices.isCurrent} = true and ${t.activityPrices.status} = 'estimated'`).get())!.n;
  const openFeedback = (await db.select({ n: sql<number>`count(*)::int` }).from(t.feedback).where(eq(t.feedback.status, "open")).get())!.n;
  const pendingReviews = (await db.select({ n: sql<number>`count(*)::int` }).from(t.reviews).where(eq(t.reviews.status, "pending")).get())!.n;
  const trips = (await db.select({ n: sql<number>`count(*)::int` }).from(t.trips).get())!.n;
  const users = (await db.select({ n: sql<number>`count(*)::int` }).from(t.users).get())!.n;
  const recent = await db.select().from(t.adminAuditLogs).orderBy(desc(t.adminAuditLogs.createdAt)).limit(10).all();
  return (
    <div>
      <h1 className="text-3xl">Dashboard</h1>
      <div className="mt-6 grid gap-4 sm:grid-cols-3">
        {stats.map((s) => (
          <Link key={s.label} href={s.href} className="rounded-md border border-line bg-surface p-5 hover:border-ink">
            <p className="text-sm text-muted">{s.label}</p>
            <p className="font-serif text-4xl tabular-nums">{s.pub}</p>
            <p className="text-xs text-muted">published · {s.draft} draft</p>
          </Link>
        ))}
      </div>
      <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Citations needing verification" value={needsVerification} href="/admin/activities?verify=1" />
        <Stat label="Prices that are estimates" value={estimatedPrices} />
        <Stat label="Open feedback & corrections" value={openFeedback} href="/admin/feedback" />
        <Stat label="Reviews awaiting moderation" value={pendingReviews} href="/admin/feedback" />
      </div>
      <p className="mt-4 text-xs text-muted">{trips} trips and {users} user profiles exist. Private trip contents are not shown in the admin area.</p>
      <h2 className="mt-10 mb-3 text-2xl">Recent changes</h2>
      {recent.length ? (
        <ul className="divide-y divide-line rounded-md border border-line bg-surface text-sm">
          {recent.map((r) => <li key={r.id} className="flex justify-between gap-3 px-4 py-2.5"><span>{r.summary}</span><span className="shrink-0 text-xs text-muted">{r.actorName} · {formatLongDate(r.createdAt)}</span></li>)}
        </ul>
      ) : (
        <p className="text-sm text-muted">No admin changes yet.</p>
      )}
    </div>
  );
}

function Stat({ label, value, href }: { label: string; value: number; href?: string }) {
  const inner = (<><p className="text-sm text-muted">{label}</p><p className="text-2xl font-semibold tabular-nums">{value}</p></>);
  return href ? <Link href={href} className="rounded-md border border-line bg-surface p-4 hover:border-ink">{inner}</Link> : <div className="rounded-md border border-line bg-surface p-4">{inner}</div>;
}
