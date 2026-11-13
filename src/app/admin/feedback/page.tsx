import Link from "next/link";
import { desc, eq } from "drizzle-orm";
import { db, t } from "@/db/client";
import { FeedbackRow, ReviewRow } from "@/components/admin/moderation";
import { requireAdminPage } from "@/lib/auth";

export default async function AdminFeedback() {
  await requireAdminPage(undefined, "/admin/feedback");
  const fb = await db.select().from(t.feedback).orderBy(desc(t.feedback.createdAt)).all();
  const reviews = await db.select({ r: t.reviews, a: t.activities.title, slug: t.activities.slug }).from(t.reviews).innerJoin(t.activities, eq(t.activities.id, t.reviews.activityId)).orderBy(desc(t.reviews.createdAt)).all();
  return (
    <div>
      <h1 className="text-3xl">Feedback, corrections &amp; reviews</h1>
      <h2 className="mt-8 mb-3 text-2xl">Messages ({fb.filter((f) => f.status === "open").length} open)</h2>
      <ul className="divide-y divide-line rounded-md border border-line bg-surface text-sm">
        {fb.map((f) => <FeedbackRow key={f.id} f={{ id: f.id, type: f.type, page: f.page, message: f.message, status: f.status, createdAt: f.createdAt }} />)}
        {!fb.length && <li className="px-4 py-6 text-center text-muted">No messages.</li>}
      </ul>
      <p className="mt-2 text-xs text-muted">Group reports reference a page only, trip contents stay private. Investigate with the reporter directly.</p>
      <h2 className="mt-10 mb-3 text-2xl">Community reviews</h2>
      <ul className="divide-y divide-line rounded-md border border-line bg-surface text-sm">
        {reviews.map(({ r, a, slug }) => <ReviewRow key={r.id} r={{ id: r.id, rating: r.rating, body: r.body, status: r.status, createdAt: r.createdAt }} activity={<Link href={`/experiences/${slug}`} className="hover:underline">{a}</Link>} />)}
        {!reviews.length && <li className="px-4 py-6 text-center text-muted">No reviews submitted.</li>}
      </ul>
    </div>
  );
}
