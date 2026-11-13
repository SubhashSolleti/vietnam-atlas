import type { Metadata } from "next";
import Link from "next/link";
import { ProsePage } from "@/components/site/prose-page";

export const metadata: Metadata = { title: "Legal information" };

export default function Legal() {
  return (
    <ProsePage eyebrow="Legal" title="Legal information">
      <p>Vietnam Atlas (local edition) is an independent, non-commercial travel-planning application. It is not an official government service and is not affiliated with the Vietnam National Authority of Tourism, any provincial tourism authority, airline, transport operator or activity provider mentioned.</p>
      <p>Trademarks and names of attractions and operators belong to their respective owners and are used for identification only.</p>
      <p>Map data © OpenStreetMap contributors, available under the Open Database Licence. Photographs © their respective authors, licensed as credited (Wikimedia Commons).</p>
      <p>See also: <Link href="/terms">Terms</Link> · <Link href="/privacy">Privacy</Link> · <Link href="/sources">Data sources</Link>.</p>
    </ProsePage>
  );
}
