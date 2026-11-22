import { and, eq } from "drizzle-orm";
import { db, t } from "@/db/client";
import { getCurrentUser } from "@/lib/auth";
import { assertMember, TripAccessError } from "@/services/trips";

/** The trip's base-plan PDF, for members only. `?download=1` saves it instead of opening it. */
export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await getCurrentUser();
  if (!user) return new Response("Not signed in", { status: 401 });
  try {
    await assertMember(id, user.id);
  } catch (e) {
    if (e instanceof TripAccessError) return new Response("Not found", { status: 404 });
    throw e;
  }
  const doc = await db.select().from(t.tripDocuments).where(and(eq(t.tripDocuments.tripId, id), eq(t.tripDocuments.kind, "base_plan"))).get();
  if (!doc) return new Response("Not found", { status: 404 });
  const download = new URL(req.url).searchParams.has("download");
  const name = doc.fileName.endsWith(".pdf") ? doc.fileName : `${doc.fileName}.pdf`;
  return new Response(new Uint8Array(doc.data), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Length": String(doc.data.byteLength),
      "Content-Disposition": `${download ? "attachment" : "inline"}; filename="${name.replace(/[^\x20-\x7e]|"/g, "_")}"; filename*=UTF-8''${encodeURIComponent(name)}`,
      // Private: the trip's own document, behind its members' sign-in. Links carry ?v=<upload time>, so a replaced
      // PDF is a new URL and an old copy can be reused for a while.
      "Cache-Control": "private, max-age=3600",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
