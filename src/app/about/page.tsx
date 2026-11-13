import type { Metadata } from "next";
import Link from "next/link";
import { ProsePage } from "@/components/site/prose-page";

export const metadata: Metadata = { title: "About Vietnam Atlas", alternates: { canonical: "/about" } };

export default function About() {
  return (
    <ProsePage eyebrow="About" title="About Vietnam Atlas" intro="A discovery and collaborative trip-planning companion for Vietnam, built so a traveller who knows nothing about the country can understand where to go, what things cost, when to visit and how to plan it with friends.">
      <h2>What it does</h2>
      <ul>
        <li>Destination guides with attractions, experience catalogues, food, nightlife, free things to do and practical logistics.</li>
        <li>Hundreds of individually researched experiences, each with estimated prices, December suitability, safety notes and alternatives.</li>
        <li>A personal wishlist and comparison tool, and a group workspace for invitations, preferences, voting and consensus.</li>
        <li>An itinerary builder with transport, accommodation, conflict detection and a budget engine that splits costs by who actually takes part.</li>
      </ul>
      <h2>How we handle accuracy</h2>
      <p>Every fact carries a status (verified official, verified provider, estimate, community source or needs verification) and a list of sources with a last-reviewed date. We never present an estimate as a verified price, never invent ratings or reviews, and only list dated events that have an authoritative public listing. See <Link href="/sources">Data sources &amp; accuracy</Link>.</p>
      <h2>Independence</h2>
      <p>Vietnam Atlas is an independent project. It is not affiliated with, endorsed by or operated on behalf of the Vietnam National Authority of Tourism or any operator listed. We do not sell bookings or take commissions.</p>
      <h2>Local edition</h2>
      <p>This edition runs entirely on your own machine: the database is a local SQLite file and photographs are stored locally. Group collaboration works between browsers that can reach this server (for example on your home network). Map tiles are loaded from OpenStreetMap and need an internet connection.</p>
    </ProsePage>
  );
}
