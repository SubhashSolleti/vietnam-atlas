import { eq } from "drizzle-orm";
import { db, t } from "@/db/client";
import { UPLOAD_NAME } from "@/lib/uploads";

/** Admin-uploaded images, stored in Postgres. File names embed a timestamp and are never reused, so the CDN caches them for a year. */
export async function GET(_req: Request, { params }: { params: Promise<{ file: string }> }) {
  const { file } = await params;
  if (!UPLOAD_NAME.test(file)) return new Response("Not found", { status: 404 });
  const blob = await db.select().from(t.mediaBlobs).where(eq(t.mediaBlobs.name, file)).get();
  if (!blob) return new Response("Not found", { status: 404 });
  return new Response(new Uint8Array(blob.data), {
    headers: {
      "Content-Type": blob.contentType,
      "Cache-Control": "public, max-age=31536000, s-maxage=31536000, immutable",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
