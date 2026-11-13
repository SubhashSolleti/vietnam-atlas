import { expect, type Page } from "@playwright/test";

/** Set for the test database by scripts/e2e-reset.ts (seeded passwords are never defaults). */
export const E2E_ADMIN_PASSWORD = "e2e-admin-password-2026";

/** Fails the test on uncaught page errors or console errors (ignoring map-tile network noise). */
export function watchErrors(page: Page) {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(`pageerror: ${e.message}`));
  page.on("console", (m) => {
    if (m.type() !== "error") return;
    const t = m.text();
    if (/tile\.openstreetmap|Failed to load resource|favicon|net::ERR/i.test(t)) return;
    errors.push(`console: ${t}`);
  });
  return {
    errors,
    assertClean: () => expect(errors, errors.join("\n")).toEqual([]),
  };
}

export async function toast(page: Page, text: RegExp | string) {
  await expect(page.getByRole("status").filter({ hasText: text }).first()).toBeVisible();
}
