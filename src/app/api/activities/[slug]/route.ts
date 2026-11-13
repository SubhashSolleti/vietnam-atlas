import { NextResponse } from "next/server";
import { getCatalog } from "@/services/catalog";

/** Minimal public activity lookup used by client pickers. */
export async function GET(_req: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const a = getCatalog().activities.find((x) => x.slug === slug);
  if (!a) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ id: a.id, slug: a.slug, title: a.title, destination: a.destinationName, durationHours: a.durationHours, price: a.price, priceTier: a.priceTier });
}
