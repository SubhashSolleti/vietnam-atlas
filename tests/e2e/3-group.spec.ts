import { expect, test } from "@playwright/test";
import { watchErrors } from "./helpers";

test("Scenario 3: create a trip, invite, join from another browser, preferences, vote", async ({ page, browser }) => {
  const w = watchErrors(page);
  // Owner creates a trip for seven
  await page.goto("/group/new");
  await page.getByLabel("Trip name").fill("E2E Cousins Test");
  await page.getByLabel("Your name (as the group will see it)").fill("Asha");
  await page.getByLabel("Start date").fill("2026-12-12");
  await page.getByLabel("End date").fill("2026-12-25");
  await page.getByLabel("Travellers").fill("7");
  await page.getByLabel("Budget per person (₹)").fill("65000");
  await page.getByRole("button", { name: "Create trip" }).click();
  await expect(page).toHaveURL(/\/group\/[0-9a-f-]+\?tab=members/);
  await expect(page.getByRole("heading", { level: 1, name: "E2E Cousins Test" })).toBeVisible();
  await expect(page.getByRole("listitem").filter({ hasText: /Traveller 7/ })).toBeVisible();
  const code = (await page.getByText(/^Code/).locator("strong").textContent())!.trim();
  expect(code).toMatch(/^[A-Z0-9]{8}$/);
  const tripUrl = page.url().split("?")[0]!;

  // Owner proposes an activity to the shortlist
  await page.goto("/experiences/phu-quoc-three-island-snorkelling");
  await page.getByRole("button", { name: "Add to trip shortlist" }).click();
  await expect(page.getByRole("link", { name: /On shortlist/ }).first()).toBeVisible();

  // Second traveller joins with the invite link in a separate browser context
  const ctx2 = await browser.newContext();
  const p2 = await ctx2.newPage();
  await p2.goto(`/join/${code}`);
  await expect(p2.getByRole("heading", { name: "E2E Cousins Test" })).toBeVisible();
  await p2.getByRole("radio", { name: /Traveller 2/ }).check();
  await p2.getByLabel(/Your name/).fill("Ravi");
  await p2.getByRole("button", { name: "Join trip" }).click();
  await expect(p2).toHaveURL(/tab=preferences/);

  // Configure preferences
  await p2.getByRole("button", { name: "Beaches & islands" }).click();
  await p2.getByRole("button", { name: "Vegetarian" }).click();
  await p2.getByRole("button", { name: "Save preferences" }).click();
  await expect(p2.getByRole("status").filter({ hasText: "Preferences saved" })).toBeVisible();

  // Second traveller votes Must do
  await p2.goto(`${tripUrl}?tab=shortlist`);
  const card = p2.getByRole("listitem").filter({ hasText: /Three-island snorkelling/ }).first();
  await card.getByRole("radio", { name: "Must do" }).click();
  await expect(card.getByText(/Ravi: Must do/)).toBeVisible();

  // Owner sees updated votes (live refresh or reload)
  await page.goto(`${tripUrl}?tab=shortlist`);
  const ownerCard = page.getByRole("listitem").filter({ hasText: /Three-island snorkelling/ }).first();
  await expect(ownerCard.getByText(/Ravi: Must do/)).toBeVisible();
  await expect(ownerCard.getByText(/2\/7 voted/)).toBeVisible();

  // Owner records a vote for an unjoined traveller and approves via group decision
  await ownerCard.getByLabel("Record a vote on behalf of").selectOption({ label: "For Traveller 3 (not joined)" });
  await ownerCard.getByRole("radio", { name: "Interested", exact: true }).click();
  await expect(ownerCard.getByText(/3\/7 voted/)).toBeVisible();
  await page.goto(`${tripUrl}?tab=consensus`);
  await expect(page.getByRole("heading", { name: /Suggested group shortlist/ })).toBeVisible();

  // Comments
  await page.goto(`${tripUrl}?tab=shortlist`);
  const c = page.getByRole("listitem").filter({ hasText: /Three-island snorkelling/ }).first();
  await c.getByRole("button", { name: /comment/ }).click();
  await c.getByLabel("Add a comment").fill("Morning slot please: calmer sea");
  await c.getByRole("button", { name: "Post" }).click();
  await expect(c.getByText("Morning slot please: calmer sea")).toBeVisible();

  // Outsider cannot access the private trip
  const ctx3 = await browser.newContext();
  const p3 = await ctx3.newPage();
  await p3.goto(tripUrl);
  await expect(p3).toHaveURL(/\/group$/);
  await expect(p3.getByText("E2E Cousins Test")).toHaveCount(0);
  await ctx2.close();
  await ctx3.close();
  w.assertClean();
});
