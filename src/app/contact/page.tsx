import type { Metadata } from "next";
import { ContactForm } from "@/components/site/contact-form";

export const metadata: Metadata = { title: "Contact & corrections" };

export default async function Contact({ searchParams }: { searchParams: Promise<{ page?: string }> }) {
  const { page } = await searchParams;
  return (
    <div className="container-x max-w-2xl pt-12">
      <p className="eyebrow mb-2">Contact</p>
      <h1 className="text-4xl">Contact &amp; corrections</h1>
      <p className="mt-3 text-muted">Found an out-of-date price, a closed attraction or a broken link? Tell us and an editor will review it. You can also send general feedback or report a problem with a group.</p>
      <ContactForm page={page} />
    </div>
  );
}
