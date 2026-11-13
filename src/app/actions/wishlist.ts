"use server";

import { revalidatePath } from "next/cache";
import { and, eq, inArray } from "drizzle-orm";
import { z } from "zod";
import { db, t } from "@/db/client";
import { run, UserError } from "@/lib/action";
import { requireUser } from "@/lib/auth";

const entity = z.object({
  entityType: z.enum(["activity", "attraction", "destination"]),
  entityId: z.string().uuid(),
});

async function assertEntityExists(entityType: "activity" | "attraction" | "destination", entityId: string) {
  const table = entityType === "activity" ? t.activities : entityType === "attraction" ? t.attractions : t.destinations;
  const row = await db.select({ id: table.id }).from(table).where(eq(table.id, entityId)).get();
  if (!row) throw new UserError("That item no longer exists.");
}

/**
 * Save or unsave. Pass `save` (what the user clicked) so the result is idempotent: a stale tab that still shows
 * "Save" saves the item instead of flipping a save made elsewhere.
 */
export async function toggleWishlist(input: { entityType: "activity" | "attraction" | "destination"; entityId: string; save?: boolean }) {
  return run(async () => {
    const { entityType, entityId } = entity.parse(input);
    const save = z.boolean().optional().parse(input.save);
    const user = await requireUser();
    await assertEntityExists(entityType, entityId);
    const where = and(eq(t.wishlistItems.userId, user.id), eq(t.wishlistItems.entityType, entityType), eq(t.wishlistItems.entityId, entityId));
    const existing = await db.select().from(t.wishlistItems).where(where).get();
    const want = save ?? !existing;
    if (!want && existing) await db.delete(t.wishlistItems).where(eq(t.wishlistItems.id, existing.id)).run();
    if (want && !existing) await db.insert(t.wishlistItems).values({ userId: user.id, entityType, entityId, state: "wishlist" }).onConflictDoNothing().run();
    revalidatePath("/", "layout");
    return { saved: want };
  });
}

const stateSchema = entity.extend({
  state: z.enum(["interested", "wishlist", "must_do", "completed", "rejected"]).optional(),
  priority: z.number().int().min(1).max(3).optional(),
  note: z.string().max(1000).nullable().optional(),
});

/** Upserts the personal state of an item (interested / must-do / note / priority). */
export async function setWishlistState(input: z.input<typeof stateSchema>) {
  return run(async () => {
    const v = stateSchema.parse(input);
    const user = await requireUser();
    await assertEntityExists(v.entityType, v.entityId);
    const patch = {
      ...(v.state ? { state: v.state } : {}),
      ...(v.priority ? { priority: v.priority } : {}),
      ...(v.note !== undefined ? { note: v.note?.trim() || null } : {}),
    };
    await db.insert(t.wishlistItems)
      .values({ userId: user.id, entityType: v.entityType, entityId: v.entityId, state: v.state ?? "wishlist", priority: v.priority ?? 2, note: v.note ?? null })
      .onConflictDoUpdate({ target: [t.wishlistItems.userId, t.wishlistItems.entityType, t.wishlistItems.entityId], set: patch })
      .run();
    revalidatePath("/", "layout");
    return {};
  });
}

export async function removeWishlistItems(ids: string[]) {
  return run(async () => {
    const parsed = z.array(z.string().uuid()).max(500).parse(ids);
    const user = await requireUser();
    if (parsed.length)
      await db.delete(t.wishlistItems).where(and(eq(t.wishlistItems.userId, user.id), inArray(t.wishlistItems.id, parsed))).run();
    revalidatePath("/", "layout");
    return { removed: parsed.length };
  });
}

/** Add to / remove from the comparison. Pass `add` (what the user clicked) for an idempotent result. */
export async function toggleCompare(activityId: string, add?: boolean) {
  return run(async () => {
    const id = z.string().uuid().parse(activityId);
    z.boolean().optional().parse(add);
    const user = await requireUser();
    await assertEntityExists("activity", id);
    const where = and(eq(t.comparisons.userId, user.id), eq(t.comparisons.activityId, id));
    const existing = await db.select().from(t.comparisons).where(where).get();
    const want = add ?? !existing;
    if (!want) {
      if (existing) await db.delete(t.comparisons).where(where).run();
    } else if (!existing) {
      const count = (await db.select().from(t.comparisons).where(eq(t.comparisons.userId, user.id)).all()).length;
      if (count >= 4) throw new UserError("You can compare up to 4 activities. Remove one first.");
      await db.insert(t.comparisons).values({ userId: user.id, activityId: id }).run();
    }
    revalidatePath("/", "layout");
    const count = (await db.select().from(t.comparisons).where(eq(t.comparisons.userId, user.id)).all()).length;
    return { inCompare: want, count };
  });
}

export async function clearCompare() {
  return run(async () => {
    const user = await requireUser();
    await db.delete(t.comparisons).where(eq(t.comparisons.userId, user.id)).run();
    revalidatePath("/", "layout");
    return {};
  });
}
