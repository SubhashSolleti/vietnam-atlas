import "server-only";
import { cache } from "react";
import { createHash, randomBytes, scrypt as _scrypt, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";
import { cookies, headers } from "next/headers";
import { notFound, redirect } from "next/navigation";
import { UserError } from "./action";
import { rateLimit } from "./rate-limit";
import { and, eq, gt, lt } from "drizzle-orm";
import { db, t } from "@/db/client";

const scrypt = promisify(_scrypt) as (pw: string, salt: Buffer, len: number) => Promise<Buffer>;

export const SESSION_COOKIE = "atlas_session";
const SESSION_DAYS = 180;

export type Role = "super_admin" | "content_editor" | "member" | "visitor";
export type CurrentUser = typeof t.users.$inferSelect;

export async function hashPassword(password: string) {
  const salt = randomBytes(16);
  const key = await scrypt(password, salt, 64);
  return `scrypt$${salt.toString("hex")}$${key.toString("hex")}`;
}

export async function verifyPassword(password: string, stored: string | null) {
  if (!stored) return false;
  const [scheme, saltHex, keyHex] = stored.split("$");
  if (scheme !== "scrypt" || !saltHex || !keyHex) return false;
  const key = await scrypt(password, Buffer.from(saltHex, "hex"), 64);
  const expected = Buffer.from(keyHex, "hex");
  return expected.length === key.length && timingSafeEqual(expected, key);
}

const hashToken = (token: string) => createHash("sha256").update(token).digest("hex");

async function setSessionCookie(token: string) {
  const jar = await cookies();
  jar.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production" && process.env.INSECURE_COOKIES !== "1",
    path: "/",
    maxAge: SESSION_DAYS * 86400,
  });
}

export async function createSession(userId: string) {
  const token = randomBytes(32).toString("base64url");
  const expiresAt = new Date(Date.now() + SESSION_DAYS * 86400_000).toISOString();
  db.insert(t.sessions).values({ id: hashToken(token), userId, expiresAt }).run();
  await setSessionCookie(token);
  // Opportunistic cleanup of expired sessions.
  db.delete(t.sessions).where(lt(t.sessions.expiresAt, new Date().toISOString())).run();
}

export async function destroySession() {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  if (token) db.delete(t.sessions).where(eq(t.sessions.id, hashToken(token))).run();
  jar.delete(SESSION_COOKIE);
}

/** Read-only: safe in Server Components. Returns null for anonymous visitors. */
/** One lookup per request: layouts, pages and components all ask for the current user. */
export const getCurrentUser = cache(async (): Promise<CurrentUser | null> => {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  const row = db
    .select({ user: t.users })
    .from(t.sessions)
    .innerJoin(t.users, eq(t.users.id, t.sessions.userId))
    .where(and(eq(t.sessions.id, hashToken(token)), gt(t.sessions.expiresAt, new Date().toISOString())))
    .get();
  if (!row || row.user.disabledAt) return null;
  return row.user;
});

const GUEST_COLORS = ["#173F35", "#377A61", "#C96F50", "#D6AB59", "#5B6F8F", "#8A5A83", "#6E7B3A"];

/**
 * For Server Actions / Route Handlers only (it may set a cookie).
 * Returns the signed-in user or transparently creates a local guest account so that
 * wishlists and votes persist for anonymous visitors.
 */
export async function requireUser(): Promise<CurrentUser> {
  const existing = await getCurrentUser();
  if (existing) return existing;
  // Guest profiles are cheap to create, so cap how fast one client (or, without a trusted proxy, everyone) can mint them.
  if (!(await limitClient("guest", 30, 10 * 60_000))) throw new UserError("Too many new visitors from your network right now. Please try again in a few minutes.");
  const guestNo = Math.floor(1000 + Math.random() * 9000);
  const user = db
    .insert(t.users)
    .values({
      displayName: `Guest ${guestNo}`,
      isGuest: true,
      role: "visitor",
      avatarColor: GUEST_COLORS[guestNo % GUEST_COLORS.length]!,
    })
    .returning()
    .get();
  await createSession(user.id);
  return user;
}

export class AuthError extends Error {
  constructor(message = "You do not have permission to do that.") {
    super(message);
  }
}

export async function requireRole(roles: Role[]) {
  const user = await getCurrentUser();
  if (!user || !roles.includes(user.role as Role)) throw new AuthError();
  return user;
}

export const ADMIN_ROLES: Role[] = ["super_admin", "content_editor"];

/**
 * Guard for admin *pages*. Layouts don't run for every request a page answers (e.g. RSC fetches),
 * so each admin page must authorise itself before reading data.
 */
export async function requireAdminPage(roles: Role[] = ADMIN_ROLES, path = "/admin") {
  const user = await getCurrentUser();
  if (!user || user.isGuest) redirect(`/login?next=${encodeURIComponent(path)}`);
  if (!roles.includes(user.role as Role)) notFound();
  return user;
}

export function isAdmin(user: Pick<CurrentUser, "role"> | null | undefined) {
  return !!user && ADMIN_ROLES.includes(user.role as Role);
}

/**
 * Per-client rate limit. Without a trusted proxy every visitor shares one bucket, so that shared bucket gets a
 * ten-times higher ceiling: enough to stop floods without one visitor locking everybody else out.
 */
export async function limitClient(scope: string, limit: number, windowMs: number) {
  const key = await clientKey(scope);
  return rateLimit(key, key.endsWith(":direct") ? limit * 10 : limit, windowMs).ok;
}

export async function clientKey(scope: string) {
  const h = await headers();
  // X-Forwarded-For is client-controlled unless a proxy we trust overwrites it. Behind such a proxy
  // (TRUST_PROXY=1) use the address it appended; the last entry; otherwise don't trust it at all.
  const forwarded = process.env.TRUST_PROXY === "1" ? h.get("x-forwarded-for")?.split(",").at(-1)?.trim() : null;
  return `${scope}:${forwarded || "direct"}`;
}

/* ───────── Known-device cookie (login throttling) ───────── */

const DEVICE_COOKIE = "atlas_device";

function deviceSecret() {
  const row = db.select().from(t.settings).where(eq(t.settings.key, "device_secret")).get();
  if (row?.value) return String(row.value);
  const secret = randomBytes(32).toString("hex");
  db.insert(t.settings).values({ key: "device_secret", value: secret }).onConflictDoNothing().run();
  return String(db.select().from(t.settings).where(eq(t.settings.key, "device_secret")).get()!.value);
}

const deviceTag = (email: string) => createHash("sha256").update(`${deviceSecret()}:${email.toLowerCase()}`).digest("base64url").slice(0, 32);

/** True when this browser has signed in to `email` before (a signed cookie set on success). */
export async function isKnownDevice(email: string) {
  const v = (await cookies()).get(DEVICE_COOKIE)?.value ?? "";
  return v.split(".").includes(deviceTag(email));
}

/** Remember this browser for `email` (kept alongside up to four other accounts). */
export async function rememberDevice(email: string) {
  const jar = await cookies();
  const tags = new Set((jar.get(DEVICE_COOKIE)?.value ?? "").split(".").filter(Boolean));
  tags.add(deviceTag(email));
  jar.set(DEVICE_COOKIE, [...tags].slice(-5).join("."), {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 180 * 86400,
    secure: process.env.NODE_ENV === "production" && process.env.INSECURE_COOKIES !== "1",
  });
}
