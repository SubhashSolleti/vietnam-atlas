/** Recreates the end-to-end test database (a local Postgres, never production). Used by the Playwright web server. */
import { execSync } from "node:child_process";
import postgres from "postgres";

const env: NodeJS.ProcessEnv = {
  ...process.env,
  // Fixed values for the test database only (see tests/e2e/helpers.ts).
  SEED_ADMIN_PASSWORD: "e2e-admin-password-2026",
  SEED_EDITOR_PASSWORD: "e2e-editor-password-2026",
  DEMO_INVITE_CODE: "COUSINS26",
};
const url = env.DATABASE_URL ?? "";
if (!/@(localhost|127\.0\.0\.1)[:/]/.test(url)) throw new Error("E2E tests must run against a local database (DATABASE_URL).");
// Create the test database on first use.
const name = new URL(url).pathname.slice(1);
const admin = postgres(url.replace(/\/[^/?]+(\?|$)/, "/postgres$1"), { max: 1, onnotice: () => {} });
if (!(await admin`select 1 from pg_database where datname = ${name}`).length) await admin.unsafe(`create database "${name}"`);
await admin.end();
execSync("npx tsx scripts/db-reset.ts", { env, stdio: "inherit" });
