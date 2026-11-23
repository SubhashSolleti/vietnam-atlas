"use server";

import { revalidatePath } from "next/cache";
import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { db, t } from "@/db/client";
import { run, UserError } from "@/lib/action";
import { requireUser } from "@/lib/auth";
import { isPdf, MAX_PLAN_PDF_BYTES } from "@/lib/pdf-days";
import { analyseItineraryPdf } from "@/lib/pdf-extract";
import { dateRange } from "@/lib/utils";
import { fillDaysFromPdf } from "@/db/pdf-base-plan";
import { assertMember } from "@/services/trips";

/**
 * Attaches the owner's itinerary PDF to the trip as its base plan (replacing any earlier one). Everyone in the trip
 * can then open it, and each day of the board links to the page where that day starts.
 */
export async function uploadBasePlanPdf(form: FormData) {
  return run(async () => {
    const tripId = z.string().uuid().parse(form.get("tripId"));
    const user = await requireUser();
    const { trip, member } = await assertMember(tripId, user.id, ["owner", "editor"]);
    const file = form.get("file");
    if (!(file instanceof File) || file.size === 0) throw new UserError("Choose your itinerary PDF.");
    if (file.size > MAX_PLAN_PDF_BYTES) throw new UserError("PDFs must be 4 MB or smaller. Try exporting it with smaller images.");
    const bytes = new Uint8Array(await file.arrayBuffer());
    if (!isPdf(bytes)) throw new UserError("That file isn't a PDF.");
    const dates = dateRange(trip.startDate, trip.endDate);
    const dayCount = dates.length;
    const { pageCount: totalPages, dayPages, dayTexts, days } = await analyseItineraryPdf(bytes, dates).catch(() => {
      throw new UserError("That PDF couldn't be read. Try exporting it again, or saving it with Print → Save as PDF.");
    });
    const fileName = (file.name || "itinerary.pdf").replace(/[^\p{L}\p{N} ._()-]/gu, "").replace(/\s+/g, " ").trim().slice(0, 120) || "itinerary.pdf";
    const row = { fileName, contentType: "application/pdf", sizeBytes: bytes.byteLength, pageCount: totalPages, dayPages, dayTexts, data: Buffer.from(bytes), uploadedBy: member.id, createdAt: new Date().toISOString() };
    await db
      .insert(t.tripDocuments)
      .values({ tripId, kind: "base_plan", ...row })
      .onConflictDoUpdate({ target: [t.tripDocuments.tripId, t.tripDocuments.kind], set: row })
      .run();
    // Empty days take the PDF's plan: its places, and its stops as activities everyone can move, swap or skip.
    const members = await db.select({ id: t.tripMembers.id }).from(t.tripMembers).where(eq(t.tripMembers.tripId, tripId)).all();
    const filled = await fillDaysFromPdf(db, tripId, days, { partySize: Math.max(members.length, trip.travellersCount), addedBy: member.id });
    await db.update(t.trips).set({ updatedAt: new Date().toISOString() }).where(eq(t.trips.id, tripId)).run();
    revalidatePath("/", "layout");
    return { pageCount: totalPages, daysFound: dayPages.filter((p) => p != null).length, dayCount, filledDays: filled.days, filledActivities: filled.activities };
  });
}

export async function removeBasePlanPdf(tripId: string) {
  return run(async () => {
    const user = await requireUser();
    await assertMember(z.string().uuid().parse(tripId), user.id, ["owner", "editor"]);
    await db.delete(t.tripDocuments).where(and(eq(t.tripDocuments.tripId, tripId), eq(t.tripDocuments.kind, "base_plan"))).run();
    await db.update(t.trips).set({ updatedAt: new Date().toISOString() }).where(eq(t.trips.id, tripId)).run();
    revalidatePath("/", "layout");
    return {};
  });
}
