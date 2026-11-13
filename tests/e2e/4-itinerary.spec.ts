import { expect, test } from "@playwright/test";
import { watchErrors } from "./helpers";

test("Scenario 4: itinerary: route, activities, overnight transport, reorder, budget, conflicts", async ({ page }) => {
  const w = watchErrors(page);
  // Join the seeded demo trip on the editor seat (the owner seat belongs to the site admin)
  await page.goto("/join/COUSINS26");
  await page.getByRole("radio", { name: /Traveller 2/ }).check();
  await page.getByRole("button", { name: "Join trip" }).click();
  await expect(page).toHaveURL(/tab=preferences/);

  await page.goto("/trip");
  await expect(page.getByRole("heading", { level: 1, name: "Vietnam Cousins Trip 2026" })).toBeVisible();
  // Booked flights are preloaded
  await expect(page.getByText(/Land at Phu Quoc \(PQC\)/)).toBeVisible();
  const budgetBefore = await page.getByText(/^Est\./).textContent();

  // Select destinations via suggested route
  await page.getByRole("button", { name: "Suggest a route" }).click();
  await page.getByRole("dialog").getByRole("button", { name: "Apply suggestion" }).click();
  await expect(page.getByRole("status").filter({ hasText: /Filled \d+ days/ })).toBeVisible();
  await expect(page.locator("#day-2026-12-13").getByText("Phu Quoc")).toBeVisible();

  // Add an activity to 13 Dec with a time
  const d13 = page.locator("#day-2026-12-13");
  await d13.getByRole("button", { name: "Add to this day" }).click();
  const dlg = page.getByRole("dialog");
  await dlg.getByLabel("…or search the catalogue").fill("snorkel");
  await dlg.getByRole("button", { name: /Three-island snorkelling/ }).click();
  await dlg.getByLabel("Start time").fill("08:30");
  await dlg.getByRole("button", { name: "Add" }).click();
  await expect(d13.getByText("Three-island snorkelling tour")).toBeVisible();

  // Add a second, overlapping activity → conflict alert
  await d13.getByRole("button", { name: "Add to this day" }).click();
  await dlg.getByRole("radio", { name: "Restaurant" }).click();
  await dlg.getByLabel("Restaurant or meal").fill("Seafood lunch on the boat");
  await dlg.getByLabel("Start time").fill("12:00");
  await dlg.getByRole("button", { name: "Add" }).click();
  await expect(page.getByRole("complementary", { name: "Planning alerts" }).getByText("Two plans overlap")).toBeVisible();

  // Conflict with booked flight on arrival day
  const d12 = page.locator("#day-2026-12-12");
  await d12.getByRole("button", { name: "Add to this day" }).click();
  await dlg.getByRole("radio", { name: "Free time" }).click();
  await dlg.getByLabel("Title").fill("Beach walk");
  await dlg.getByLabel("Start time").fill("14:30");
  await dlg.getByRole("button", { name: "Add" }).click();
  await expect(page.getByRole("complementary", { name: "Planning alerts" }).getByText("Clashes with a booked flight").first()).toBeVisible();

  // Change ordering on 13 Dec with the keyboard (dnd-kit keyboard sensor)
  const firstBefore = await d13.getByRole("button", { name: /^Drag to reorder/ }).first().getAttribute("aria-label");
  const handle = d13.getByRole("button", { name: /^Drag to reorder/ }).first();
  await handle.focus();
  await page.keyboard.press("Space");
  await page.waitForTimeout(250);
  await page.keyboard.press("ArrowDown");
  await page.waitForTimeout(250);
  await page.keyboard.press("Space");
  await expect(d13.getByRole("button", { name: /^Drag to reorder/ }).first()).not.toHaveAttribute("aria-label", firstBefore!);

  // Overnight transport Hanoi → Sa Pa already added by the route; add another overnight leg manually
  await page.getByRole("radio", { name: "Route" }).click();
  await expect(page.getByRole("listitem").filter({ hasText: /Hanoi → Sa Pa/ }).first()).toBeVisible();
  await expect(page.getByText("Overnight").first()).toBeVisible();
  await page.getByRole("button", { name: "Transport" }).click();
  const leg = page.getByRole("dialog");
  await leg.getByLabel("From (destination)").selectOption({ label: "Ho Chi Minh City" });
  await leg.getByLabel("To (destination)").selectOption({ label: "Da Lat" });
  await leg.getByLabel("Mode").selectOption("sleeper_bus");
  await leg.getByLabel("Departure (local time)").fill("2026-12-16T22:00");
  await leg.getByLabel("Duration (minutes)").fill("450");
  await leg.getByLabel("Cost (₹)").fill("1300");
  await leg.getByLabel(/Overnight journey/).check();
  await leg.getByRole("button", { name: "Save" }).click();
  await expect(page.getByText(/Ho Chi Minh City → Da Lat/)).toBeVisible();

  // Budget has updated
  await page.reload();
  const budgetAfter = await page.getByText(/^Est\./).textContent();
  expect(budgetAfter).not.toEqual(budgetBefore);
  w.assertClean();
});
