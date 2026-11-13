import type { Metadata } from "next";
import Link from "next/link";
import { ProsePage } from "@/components/site/prose-page";

export const metadata: Metadata = { title: "Privacy" };

export default function Privacy() {
  return (
    <ProsePage eyebrow="Legal" title="Privacy" intro="Plain-language summary of what this local edition stores and why.">
      <h2>What we store</h2>
      <ul>
        <li><strong>Guest profile:</strong> created automatically the first time you save, vote or join a trip. Identified by a random session cookie; no email required.</li>
        <li><strong>Account:</strong> email, display name and a salted scrypt hash of your password (never the password itself).</li>
        <li><strong>Planning data:</strong> wishlist, comparisons, trip memberships, preferences, votes, comments, itinerary, budget items, checklist progress and networking notes.</li>
      </ul>
      <h2>Who can see it</h2>
      <ul>
        <li>Your wishlist, notes, checklist and networking contacts are private to you.</li>
        <li>Trip data (preferences, votes, comments, itinerary, budget) is visible only to members of that trip. Owners can choose anonymous vote tallies.</li>
        <li>Email addresses are never shown to other travellers.</li>
        <li>Administrators manage catalogue content; the admin area does not display private trip contents.</li>
      </ul>
      <h2>Cookies</h2>
      <p>One essential session cookie, one for your active trip and one for your theme preference. No analytics or advertising cookies.</p>
      <h2>Your rights</h2>
      <p>Export or delete your data any time from <Link href="/account">Account &amp; privacy</Link>.</p>
      <h2>Where data lives</h2>
      <p>In this local edition everything is stored in a SQLite file on the machine running the server (<code>data/atlas.db</code>). Nothing is sent to third parties, except that your browser requests map tiles directly from OpenStreetMap.</p>
    </ProsePage>
  );
}
