import type { Metadata } from "next";
import { sql } from "drizzle-orm";
import { db, t } from "@/db/client";
import { ProsePage } from "@/components/site/prose-page";
import { DataStatusBadge } from "@/components/catalog/meta";

export const metadata: Metadata = { title: "Data sources & accuracy", alternates: { canonical: "/sources" } };

export default async function SourcesPage() {
  const byStatus = await db.select({ status: t.sourceVerifications.status, n: sql<number>`count(*)::int` }).from(t.sourceVerifications).groupBy(t.sourceVerifications.status).all();
  const priceStatus = await db.select({ status: t.activityPrices.status, n: sql<number>`count(*)::int` }).from(t.activityPrices).groupBy(t.activityPrices.status).all();
  const publishers = await db.select({ publisher: t.sources.publisher, n: sql<number>`count(*)::int` }).from(t.sources).groupBy(t.sources.publisher).orderBy(sql`count(*) desc`).limit(25).all();
  const media = await db.select({ license: t.media.license, n: sql<number>`count(*)::int` }).from(t.media).groupBy(t.media.license).all();
  const credits = await db
    .select({ id: t.media.id, title: t.media.title, alt: t.media.alt, author: t.media.author, license: t.media.license, licenseUrl: t.media.licenseUrl, sourceUrl: t.media.sourceUrl })
    .from(t.media)
    .orderBy(t.media.title)
    .all();
  return (
    <ProsePage eyebrow="Accuracy" title="Data sources & accuracy" intro="This is a tourism information platform, so we are explicit about what is verified and what isn't.">
      <h2>Source priority</h2>
      <ol className="list-decimal space-y-1 pl-5">
        <li>Vietnam National Authority of Tourism</li><li>Provincial and city tourism authorities</li><li>Official national park websites</li><li>Official attraction websites</li><li>Official transport and airline websites</li><li>Official immigration and government websites</li><li>Authorised activity operators</li><li>Established tourism organisations</li><li>Reputable publishers and community references (supplementary only)</li>
      </ol>
      <h2>Status labels</h2>
      <p>
        <strong>Verified</strong> means the specific fact was checked against that source. <strong>Official reference</strong> means an authoritative site
        (a tourism authority, park or operator homepage) was used for background, prices, hours and other details on our pages may still be estimates.
      </p>
      <div className="not-prose flex flex-wrap gap-2">{["verified_official", "verified_provider", "reference", "estimated", "community", "needs_verification", "temporarily_unavailable"].map((s) => <DataStatusBadge key={s} status={s} />)}</div>
      <h2>Current coverage</h2>
      <div className="not-prose grid gap-4 sm:grid-cols-2">
        <Table title="Source citations by status" rows={byStatus.map((r) => [<DataStatusBadge key={r.status} status={r.status} />, r.n])} />
        <Table title="Activity prices by status" rows={priceStatus.map((r) => [<DataStatusBadge key={r.status} status={r.status} />, r.n])} />
      </div>
      <p>Activity prices are, with few exceptions, <strong>planning estimates</strong>: indicative ranges compiled from typical operator pricing, shown so you can budget. They are not quotes. Opening hours and entrance fees that haven't been confirmed against an official source are labelled “Needs verification”.</p>
      <h2>Most-cited publishers</h2>
      <div className="not-prose"><Table title="Publisher" rows={publishers.map((p) => [p.publisher, p.n])} /></div>
      <h2>Photography</h2>
      <p>Photographs come from Wikimedia Commons under open licences (Creative Commons BY / BY-SA, CC0 or public domain). Each image is credited with its author, licence and a link to its source page. Where we don't have a photo of a specific activity, we show an image of the destination or attraction and label it as representative.</p>
      <div className="not-prose"><Table title="Images by licence" rows={media.map((m) => [m.license ?? "Unknown", m.n])} /></div>
      <h3 id="photo-credits">Photo credits</h3>
      <details className="not-prose rounded-md border border-line bg-surface p-4 text-sm">
        <summary className="cursor-pointer font-semibold">All {credits.length} photographs: author, licence and source</summary>
        <ul className="mt-3 space-y-1.5">
          {credits.map((c) => (
            <li key={c.id}>
              {c.sourceUrl ? <a href={c.sourceUrl} rel="noopener noreferrer" className="text-accent underline">{c.title ?? c.alt}</a> : (c.title ?? c.alt)}
              {""}
              {c.author ?? "Unknown author"}
              {", "}
              {c.licenseUrl ? <a href={c.licenseUrl} rel="license noopener noreferrer" className="underline">{c.license}</a> : (c.license ?? "licence not recorded")}
            </li>
          ))}
        </ul>
      </details>
      <h2>What we don't do</h2>
      <ul>
        <li>We don't invent ticket prices, opening hours, ratings, reviews, bus schedules, event dates, availability or booking links.</li>
        <li>We don't claim comprehensive or real-time coverage. Conditions change: confirm with operators before you travel.</li>
      </ul>
    </ProsePage>
  );
}

function Table({ title, rows }: { title: string; rows: [React.ReactNode, number][] }) {
  return (
    <table className="w-full rounded-md border border-line bg-surface text-sm">
      <thead><tr className="bg-surface-2 text-left text-xs text-muted"><th className="px-3 py-2">{title}</th><th className="px-3 py-2 text-right">Count</th></tr></thead>
      <tbody className="divide-y divide-line">{rows.map(([k, n], i) => <tr key={i}><td className="px-3 py-2">{k}</td><td className="px-3 py-2 text-right tabular-nums">{n}</td></tr>)}</tbody>
    </table>
  );
}
