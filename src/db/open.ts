import "./query-helpers";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

/**
 * Postgres connection (Supabase in production).
 *
 * DATABASE_URL: the app's connection. On Vercel use Supabase's *transaction pooler* (port 6543); prepared
 * statements are disabled because a pooled connection can change between queries.
 * MIGRATION_DATABASE_URL (optional): a session-pooler or direct URL for migrations and seeding.
 * The Supabase ↔ Vercel integration's names also work: POSTGRES_URL (pooled) and POSTGRES_URL_NON_POOLING.
 */
export function databaseUrl(kind: "app" | "migrations" = "app") {
  const env = process.env;
  const app = env.DATABASE_URL || env.POSTGRES_URL;
  const url = (kind === "migrations" && (env.MIGRATION_DATABASE_URL || env.POSTGRES_URL_NON_POOLING)) || app;
  if (!url) throw new Error("DATABASE_URL is not set. Copy .env.example to .env.local and add your Supabase connection string.");
  return url;
}

/** A redacted form of the URL for logs (never prints the password). */
export function describeDatabase(url: string) {
  try {
    const u = new URL(url);
    return `${u.hostname}:${u.port || "5432"}${u.pathname}`;
  } catch {
    return "database";
  }
}

export function openDatabase(kind: "app" | "migrations" = "app") {
  const url = databaseUrl(kind);
  const local = /@(localhost|127\.0\.0\.1)[:/]/.test(url);
  const client = postgres(url, {
    prepare: false,
    // Serverless functions each keep a small pool; long-lived local servers can use a few more.
    max: kind === "migrations" ? 1 : Number(process.env.DATABASE_POOL_MAX ?? (process.env.VERCEL ? 3 : 10)),
    idle_timeout: 20,
    connect_timeout: 15,
    ssl: local ? false : "require",
    onnotice: () => {},
  });
  return { db: drizzle(client, { schema }), client };
}

export type Database = ReturnType<typeof openDatabase>["db"];
