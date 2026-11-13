import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { UPLOAD_NAME, uploadsDir } from "@/lib/uploads";

export async function GET(_req: Request, { params }: { params: Promise<{ file: string }> }) {
  const { file } = await params;
  if (!UPLOAD_NAME.test(file)) return new Response("Not found", { status: 404 });
  try {
    const body = await readFile(join(uploadsDir(), file));
    return new Response(new Uint8Array(body), {
      headers: {
        "Content-Type": "image/webp",
        // File names embed a timestamp and are never reused.
        "Cache-Control": "public, max-age=31536000, immutable",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch {
    return new Response("Not found", { status: 404 });
  }
}
