import { NextResponse, type NextRequest } from "next/server";
import { search, type SearchKind } from "@/services/catalog";

const KINDS: SearchKind[] = ["destination", "region", "attraction", "activity", "food", "guide", "transport"];

export async function GET(req: NextRequest) {
  const q = (req.nextUrl.searchParams.get("q") ?? "").slice(0, 80);
  const kinds = (req.nextUrl.searchParams.get("kinds") ?? "")
    .split(",")
    .filter((k): k is SearchKind => KINDS.includes(k as SearchKind));
  const limit = Math.max(1, Math.min(50, Math.trunc(Number(req.nextUrl.searchParams.get("limit") ?? 24)) || 24));
  try {
    const hits = await search(q, { kinds, limit });
    return NextResponse.json({ q, hits }, { headers: { "Cache-Control": "private, max-age=30" } });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ q, hits: [], error: "Search is temporarily unavailable." }, { status: 500 });
  }
}
