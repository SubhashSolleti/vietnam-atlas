import "server-only";
import { resolve } from "node:path";

/**
 * Admin uploads live outside `public/` (which `next start` only scans at startup) and are served by
 * the /media/uploads/[file] route, so new images appear immediately in production too.
 */
export function uploadsDir() {
  return resolve(/*turbopackIgnore: true*/ process.cwd(), process.env.UPLOADS_DIR ?? "data/uploads");
}

/** Upload file names are generated server-side; anything else is rejected (no path traversal). */
export const UPLOAD_NAME = /^[a-z]+-[0-9a-f]{8}-\d{10,16}\.webp$/;
