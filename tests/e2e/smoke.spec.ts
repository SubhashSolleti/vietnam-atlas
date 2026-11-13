import { expect, test } from "@playwright/test";
import { watchErrors } from "./helpers";

const PAGES = [
  "/", "/explore", "/explore/north", "/destinations", "/destinations?view=map", "/destinations/phu-quoc", "/destinations/mekong-delta", "/destinations/ha-long-bay",
  "/experiences", "/experiences?tier=free", "/experiences/phu-quoc-three-island-snorkelling", "/attractions/hanoi-temple-of-literature",
  "/guide", "/guide/visa-and-immigration", "/guide/packing-checklist", "/map", "/connect", "/search?q=pho", "/wishlist", "/group", "/trip", "/trip/budget",
  "/about", "/sources", "/privacy", "/terms", "/legal", "/contact", "/login", "/register", "/account",
];

test("every public page renders without errors", async ({ page }) => {
  const w = watchErrors(page);
  for (const path of PAGES) {
    const res = await page.goto(path);
    expect(res?.status(), path).toBe(200);
    await expect(page.locator("h1").first(), path).toBeVisible();
  }
  w.assertClean();
});

test("unknown pages return a real 404", async ({ page }) => {
  const res = await page.goto("/destinations/atlantis");
  expect(res?.status()).toBe(404);
  await expect(page.getByRole("heading", { name: "Off the map" })).toBeVisible();
});

test("theme switching persists", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Account and settings" }).click();
  await page.getByRole("radio", { name: /Dark/ }).click();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  await page.reload();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
});
