import type { Metadata } from "next";
import { ProsePage } from "@/components/site/prose-page";

export const metadata: Metadata = { title: "Terms of use" };

export default function Terms() {
  return (
    <ProsePage eyebrow="Legal" title="Terms of use">
      <h2>Information, not advice</h2>
      <p>Content is provided for general planning. Prices are estimates unless marked verified; opening hours, availability, regulations and visa rules can change without notice. Always confirm with official sources and operators before travelling or paying.</p>
      <h2>No bookings</h2>
      <p>Vietnam Atlas does not sell or broker bookings, and is not a party to any arrangement you make with operators, hosts or transport companies.</p>
      <h2>Safety</h2>
      <p>Adventure activities carry risk. Choose licensed operators, check equipment and insurance, follow local laws (including driving licence rules) and make your own judgement about weather and conditions.</p>
      <h2>Community content</h2>
      <p>Reviews and comments you post must be honest and lawful. Reviews are moderated and labelled as community content.</p>
      <h2>Photographs</h2>
      <p>Images are used under their stated open licences; credits and licence links are shown with the image (on detail pages and galleries) and every photograph is credited in full on the <a href="/sources#photo-credits">Data sources page</a>.</p>
    </ProsePage>
  );
}
