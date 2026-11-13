import { Compass } from "lucide-react";
import type { Metadata } from "next";
import { ButtonLink } from "@/components/ui/button";

export const metadata: Metadata = { title: "Page not found", robots: { index: false } };

export default function NotFound() {
  return (
    <div className="container-x max-w-xl py-24 text-center">
      <Compass className="mx-auto size-10 text-muted" />
      <h1 className="mt-4 text-4xl">Off the map</h1>
      <p className="mt-3 text-muted">We couldn't find that page. It may have been moved, unpublished, or the link may be mistyped.</p>
      <div className="mt-6 flex justify-center gap-2"><ButtonLink href="/destinations">Browse destinations</ButtonLink><ButtonLink href="/" variant="outline">Home</ButtonLink></div>
    </div>
  );
}
