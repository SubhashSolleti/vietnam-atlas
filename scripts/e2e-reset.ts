/** Recreates data/e2e.db (migrate + seed) and clears test uploads. Used by the Playwright web server command. */
import { execSync } from "node:child_process";
import { rmSync } from "node:fs";

for (const f of ["data/e2e.db", "data/e2e.db-wal", "data/e2e.db-shm", "data/e2e-uploads"]) rmSync(f, { force: true, recursive: true });
const env = {
  ...process.env,
  DATABASE_PATH: "data/e2e.db",
  // Fixed values for the test database only (see tests/e2e/helpers.ts).
  SEED_ADMIN_PASSWORD: "e2e-admin-password-2026",
  SEED_EDITOR_PASSWORD: "e2e-editor-password-2026",
  DEMO_INVITE_CODE: "COUSINS26",
};
execSync("npx tsx src/db/migrate.ts", { env, stdio: "inherit" });
execSync("npx tsx src/db/seed/index.ts", { env, stdio: "inherit" });
