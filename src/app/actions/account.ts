"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { and, eq, isNotNull } from "drizzle-orm";
import { z } from "zod";
import { db, t } from "@/db/client";
import { run, UserError, type ActionResult } from "@/lib/action";
import { clientKey, isKnownDevice, limitClient, rememberDevice, createSession, destroySession, getCurrentUser, hashPassword, requireUser, verifyPassword } from "@/lib/auth";
import { clearFailures, failures, recordFailure } from "@/lib/rate-limit";
import { ACTIVE_TRIP_COOKIE } from "@/services/trips";

const email = z.string().trim().toLowerCase().email("Enter a valid email address").max(160);
const password = z.string().min(10, "Use at least 10 characters").max(200);
let DUMMY_HASH = "";
void hashPassword("timing-equaliser-not-a-real-password").then((h) => (DUMMY_HASH = h));

export async function registerAction(_prev: ActionResult | null, form: FormData): Promise<ActionResult> {
  const res = await run(async () => {
    if (!(await limitClient("register", 10, 15 * 60_000))) throw new UserError("Too many attempts. Please try again in a few minutes.");
    const v = z
      .object({ displayName: z.string().trim().min(1, "Enter your name").max(40), email, password })
      .parse({ displayName: form.get("displayName"), email: form.get("email"), password: form.get("password") });
    if (db.select({ id: t.users.id }).from(t.users).where(eq(t.users.email, v.email)).get())
      throw new UserError("An account with this email already exists. Sign in instead.");
    const current = await getCurrentUser();
    const passwordHash = await hashPassword(v.password);
    if (current?.isGuest) {
      // Upgrade the guest account in place so wishlist, votes and trips are kept.
      db.update(t.users).set({ email: v.email, passwordHash, displayName: v.displayName, isGuest: false, role: "member" }).where(eq(t.users.id, current.id)).run();
      db.update(t.tripMembers).set({ displayName: v.displayName }).where(and(eq(t.tripMembers.userId, current.id), isNotNull(t.tripMembers.userId))).run();
      // New privilege level → new session token (the guest token stops working).
      await destroySession();
      await createSession(current.id);
    } else {
      const u = db.insert(t.users).values({ email: v.email, passwordHash, displayName: v.displayName, isGuest: false, role: "member" }).returning().get();
      await createSession(u.id);
    }
    return {};
  });
  if (res.ok) redirect(safeNext(form.get("next")));
  return res;
}

/** Only same-site relative paths are allowed as post-auth redirects. */
function safeNext(value: FormDataEntryValue | null) {
  const next = typeof value === "string" ? value : "";
  return next.startsWith("/") && !next.startsWith("//") && !next.startsWith("/\\") ? next : "/account";
}

export async function loginAction(_prev: ActionResult | null, form: FormData): Promise<ActionResult> {
  const res = await run(async () => {
    if (!(await limitClient("login", 20, 15 * 60_000))) throw new UserError("Too many sign-in attempts. Please wait 15 minutes.");
    const v = z.object({ email, password: z.string().min(1, "Enter your password") }).parse({ email: form.get("email"), password: form.get("password") });
    // Only failed attempts count. Per account *and* client, so a stranger can't lock the real owner out;
    // plus a high per-account ceiling so many clients can't brute-force one password either.
    // A browser that has signed in to this account before gets its own budget, so attacks from
    // elsewhere can never lock the real owner out (OWASP "device cookie" pattern).
    const known = await isKnownDevice(v.email);
    const clientAccount = known ? `login-fail-device:${v.email}` : `${await clientKey("login-fail")}:${v.email}`;
    const WINDOW = 15 * 60_000;
    if (failures(clientAccount) >= 10 || (!known && failures(`login-fail-account:${v.email}`) >= 100))
      throw new UserError("Too many sign-in attempts. Please wait 15 minutes.");
    const user = db.select().from(t.users).where(eq(t.users.email, v.email)).get();
    // Always run the password hash so response time doesn't reveal whether the email exists.
    const valid = await verifyPassword(v.password, user?.passwordHash ?? DUMMY_HASH);
    if (!user || user.disabledAt || !valid) {
      recordFailure(clientAccount, WINDOW);
      recordFailure(`login-fail-account:${v.email}`, WINDOW);
      throw new UserError("Email or password is incorrect.");
    }
    clearFailures(clientAccount);
    await rememberDevice(v.email);
    await destroySession();
    await createSession(user.id);
    return {};
  });
  if (res.ok) redirect(safeNext(form.get("next")));
  return res;
}

export async function logoutAction() {
  await destroySession();
  (await cookies()).delete(ACTIVE_TRIP_COOKIE);
  redirect("/");
}

export async function updateAccount(input: { displayName?: string; avatarColor?: string }) {
  return run(async () => {
    const v = z.object({ displayName: z.string().trim().min(1).max(40).optional(), avatarColor: z.string().regex(/^#[0-9a-fA-F]{6}$/).optional() }).parse(input);
    const user = await requireUser();
    db.update(t.users).set(v).where(eq(t.users.id, user.id)).run();
    revalidatePath("/", "layout");
    return {};
  });
}

export async function setTheme(theme: "system" | "light" | "dark") {
  const v = z.enum(["system", "light", "dark"]).parse(theme);
  (await cookies()).set("atlas_theme", v, { path: "/", maxAge: 365 * 86400, sameSite: "lax" });
  const user = await getCurrentUser();
  if (user) db.update(t.users).set({ theme: v }).where(eq(t.users.id, user.id)).run();
  return { ok: true as const };
}

export async function deleteAccount(confirmation: string) {
  const res = await run(async () => {
    const user = await getCurrentUser();
    if (!user) throw new UserError("You're not signed in.");
    if (confirmation.trim().toUpperCase() !== "DELETE") throw new UserError('Type DELETE to confirm.');
    const owned = db.select().from(t.tripMembers).where(and(eq(t.tripMembers.userId, user.id), eq(t.tripMembers.role, "owner"))).all();
    for (const m of owned) {
      const others = db.select().from(t.tripMembers).where(and(eq(t.tripMembers.tripId, m.tripId), isNotNull(t.tripMembers.userId))).all().filter((x) => x.userId !== user.id);
      if (others.length) throw new UserError("You own a trip that others have joined. Transfer ownership first (Group Planner → Members).");
    }
    db.transaction((tx) => {
      // Trips nobody else has joined are deleted outright (with their plans, votes and invite code).
      for (const m of owned) tx.delete(t.trips).where(eq(t.trips.id, m.tripId)).run();
      // In shared trips the seat is released and anonymised: name, preferences and comments are removed;
      // anonymous votes stay so the group's tallies don't silently change.
      for (const seat of tx.select().from(t.tripMembers).where(eq(t.tripMembers.userId, user.id)).all()) {
        tx.update(t.tripMembers).set({ userId: null, joinedAt: null, role: "member", displayName: "Former traveller" }).where(eq(t.tripMembers.id, seat.id)).run();
        tx.delete(t.tripPreferences).where(eq(t.tripPreferences.memberId, seat.id)).run();
        tx.insert(t.tripPreferences).values({ memberId: seat.id }).run();
        tx.update(t.comments).set({ deletedAt: new Date().toISOString() }).where(eq(t.comments.memberId, seat.id)).run();
        tx.update(t.trips).set({ updatedAt: new Date().toISOString() }).where(eq(t.trips.id, seat.tripId)).run();
      }
      // Personal data (sessions, wishlist, checklist progress, reviews…) is removed by cascade.
      tx.delete(t.users).where(eq(t.users.id, user.id)).run();
    });
    await destroySession();
    return {};
  });
  if (res.ok) redirect("/?deleted=1");
  return res;
}

/* Checklist */
export async function toggleChecklistItem(itemId: string, done: boolean) {
  return run(async () => {
    z.string().uuid().parse(itemId);
    const user = await requireUser();
    if (done) db.insert(t.checklistProgress).values({ userId: user.id, itemId, doneAt: new Date().toISOString() }).onConflictDoNothing().run();
    else db.delete(t.checklistProgress).where(and(eq(t.checklistProgress.userId, user.id), eq(t.checklistProgress.itemId, itemId))).run();
    revalidatePath("/guide", "layout");
    return {};
  });
}

/* Networking prep */
export async function saveNetworkingProfile(input: { headline?: string; introduction?: string; linkedinUrl?: string; interests?: string[] }) {
  return run(async () => {
    const v = z
      .object({
        headline: z.string().trim().max(120).optional(),
        introduction: z.string().trim().max(1500).optional(),
        linkedinUrl: z
          .string()
          .trim()
          .max(200)
          .refine((u) => !u || /^https:\/\/([a-z]{2,3}\.)?linkedin\.com\//i.test(u), "Use a full https://linkedin.com/… URL")
          .optional(),
        interests: z.array(z.string().trim().max(40)).max(15).optional(),
      })
      .parse(input);
    const user = await requireUser();
    db.insert(t.userProfiles)
      .values({ userId: user.id, headline: v.headline, introduction: v.introduction, linkedinUrl: v.linkedinUrl || null, interests: v.interests ?? [] })
      .onConflictDoUpdate({ target: t.userProfiles.userId, set: { headline: v.headline, introduction: v.introduction, linkedinUrl: v.linkedinUrl || null, interests: v.interests ?? [] } })
      .run();
    revalidatePath("/connect");
    return {};
  });
}

const contactSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(80),
  company: z.string().trim().max(80).nullable().optional(),
  role: z.string().trim().max(80).nullable().optional(),
  metAt: z.string().trim().max(120).nullable().optional(),
  notes: z.string().trim().max(2000).nullable().optional(),
  followUpDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().optional().or(z.literal("").transform(() => null)),
  followedUp: z.boolean().optional(),
});

export async function saveContact(contactId: string | null, input: z.input<typeof contactSchema>) {
  return run(async () => {
    const v = contactSchema.parse(input);
    const user = await requireUser();
    if (contactId) {
      const c = db.select().from(t.networkingContacts).where(and(eq(t.networkingContacts.id, contactId), eq(t.networkingContacts.userId, user.id))).get();
      if (!c) throw new UserError("Contact not found.");
      db.update(t.networkingContacts).set(v).where(eq(t.networkingContacts.id, contactId)).run();
    } else {
      db.insert(t.networkingContacts).values({ userId: user.id, ...v }).run();
    }
    revalidatePath("/connect");
    return {};
  });
}

export async function deleteContact(contactId: string) {
  return run(async () => {
    const user = await requireUser();
    db.delete(t.networkingContacts).where(and(eq(t.networkingContacts.id, contactId), eq(t.networkingContacts.userId, user.id))).run();
    revalidatePath("/connect");
    return {};
  });
}

/* Feedback / corrections */
export async function submitFeedback(input: { type: "feedback" | "correction" | "group_report"; message: string; page?: string }) {
  return run(async () => {
    if (!(await limitClient("feedback", 8, 10 * 60_000))) throw new UserError("Thanks: you've sent several messages already. Please try again later.");
    const v = z
      .object({ type: z.enum(["feedback", "correction", "group_report"]), message: z.string().trim().min(10, "Please write at least a sentence").max(3000), page: z.string().max(300).optional() })
      .parse(input);
    const user = await getCurrentUser();
    db.insert(t.feedback).values({ ...v, userId: user?.id ?? null }).run();
    return {};
  });
}

/* Reviews (community, moderated) */
export async function submitReview(input: { activityId: string; rating: number; body: string; visitedOn?: string }) {
  return run(async () => {
    const v = z
      .object({
        activityId: z.string().uuid(),
        rating: z.number().int().min(1).max(5),
        body: z.string().trim().min(30, "Please write at least 30 characters").max(2000),
        visitedOn: z.string().regex(/^\d{4}-\d{2}$/).optional(),
      })
      .parse(input);
    const user = await getCurrentUser();
    if (!user || user.isGuest) throw new UserError("Create a free account to write a review.");
    // One review per person per experience: writing again replaces it and sends it back to moderation.
    db.insert(t.reviews)
      .values({ ...v, userId: user.id, status: "pending" })
      .onConflictDoUpdate({ target: [t.reviews.activityId, t.reviews.userId], set: { rating: v.rating, body: v.body, visitedOn: v.visitedOn ?? null, status: "pending", createdAt: new Date().toISOString() } })
      .run();
    return {};
  });
}
