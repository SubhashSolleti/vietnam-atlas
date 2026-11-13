import { expect, test } from "@playwright/test";
import { watchErrors } from "./helpers";

test("Scenario 7: mobile: navigation, modal search, gallery, activity selection, itinerary", async ({ page }) => {
  const w = watchErrors(page);
  await page.goto("/");
  // No horizontal scroll at 390px
  // Mobile browsers zoom out when content is wider than the screen, so check the layout viewport too.
  for (const path of ["/", "/destinations/hanoi", "/experiences", "/guide", "/group"]) {
    await page.goto(path);
    const m = await page.evaluate(() => ({ inner: window.innerWidth, scroll: document.documentElement.scrollWidth }));
    expect(m.inner, path).toBe(390);
    expect(m.scroll, path).toBeLessThanOrEqual(390);
  }
  await page.goto("/");

  // Bottom navigation
  const bottom = page.getByRole("navigation", { name: "Quick navigation" });
  await expect(bottom).toBeVisible();
  await bottom.getByRole("link", { name: "Experiences" }).click();
  await expect(page).toHaveURL(/\/experiences/);

  // Drawer menu
  await page.getByRole("button", { name: "Open menu" }).click();
  await page.getByRole("dialog").getByRole("link", { name: "Destinations" }).click();
  await expect(page).toHaveURL(/\/destinations$/);

  // Mobile filters (bottom sheet)
  await page.getByRole("button", { name: /^Filters/ }).click();
  await expect(page.getByRole("dialog", { name: "Filters" })).toBeVisible();
  await page.getByRole("dialog").getByRole("checkbox", { name: /Northern Vietnam/ }).check();
  await page.getByRole("dialog").getByRole("button", { name: /^Show \d+ results/ }).click();
  await expect(page).toHaveURL(/region=north/);

  // Gallery lightbox on a destination
  await page.goto("/destinations/hanoi");
  const galleryBtn = page.getByRole("button", { name: /^Open photo 1 of/ });
  if (await galleryBtn.count()) {
    await galleryBtn.first().click();
    await expect(page.getByRole("dialog", { name: "Photo viewer" })).toBeVisible();
    await page.getByRole("button", { name: "Close photo viewer" }).click();
  }

  // Select an activity on mobile
  await page.goto("/experiences/hanoi-street-food-tour".replace("hanoi-street-food-tour", (await page.request.get("/api/search?q=hanoi%20food%20tour&kinds=activity,food").then((r) => r.json())).hits[0].href.split("/").pop()));
  await page.getByRole("button", { name: "Save to wishlist" }).first().click();
  await expect(page.getByRole("button", { name: "Saved" }).first()).toBeVisible();

  // Itinerary editing on mobile
  await page.goto("/group/new");
  await page.getByLabel("Trip name").fill("Mobile trip");
  await page.getByLabel("Your name (as the group will see it)").fill("M");
  await page.getByLabel("Start date").fill("2026-12-12");
  await page.getByLabel("End date").fill("2026-12-14");
  await page.getByRole("button", { name: "Create trip" }).click();
  await expect(page).toHaveURL(/tab=members/);
  await page.goto("/trip");
  const day = page.locator("#day-2026-12-12");
  await day.getByRole("button", { name: "Add to this day" }).click();
  await page.getByRole("dialog").getByRole("radio", { name: "Note" }).click();
  await page.getByRole("dialog").getByLabel("Note", { exact: true }).fill("Buy SIM at airport");
  await page.getByRole("dialog").getByRole("button", { name: "Add" }).click();
  await expect(day.getByText("Buy SIM at airport")).toBeVisible();
  w.assertClean();
});
