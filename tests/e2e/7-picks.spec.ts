import { expect, test } from "@playwright/test";
import { E2E_ADMIN_PASSWORD, toast, watchErrors } from "./helpers";

test("Scenario 7: travellers pick on top of the base plan and the owner builds personal plans", async ({ page, browser }) => {
  const w = watchErrors(page);
  // A cousin joins with just a name: no account.
  await page.goto("/join/COUSINS26");
  await page.getByLabel(/Your name/).fill("Kiran");
  await page.getByRole("radio", { name: /Traveller 3/ }).check();
  await page.getByRole("button", { name: "Join trip" }).click();
  await expect(page).toHaveURL(/tab=plan/);
  const tripUrl = page.url().split("?")[0]!;

  // The base plan is there, with the booked flights.
  await expect(page.getByText("Fly Phu Quoc → Ho Chi Minh City (10:35 to 11:45)")).toBeVisible();
  await expect(page.getByText("Fly Da Nang → Hanoi (08:00 to 09:20)")).toBeVisible();

  // Already done VinWonders, skipping the Kiss of the Sea show.
  const vin = page.getByRole("radiogroup", { name: "Your pick for VinWonders Phu Quoc" });
  await vin.getByRole("radio", { name: "Already done" }).click();
  await expect(vin.getByRole("radio", { name: "Already done" })).toHaveAttribute("aria-checked", "true");
  const show = page.getByRole("radiogroup", { name: "Your pick for Kiss of the Sea show" });
  await show.getByRole("radio", { name: "Skip" }).click();
  await expect(show.getByRole("radio", { name: "Skip" })).toHaveAttribute("aria-checked", "true");

  // An extra at Phu Quoc that isn't in the base plan.
  const extras = page.getByRole("region", { name: "Phu Quoc" });
  await extras.getByRole("button", { name: /Show \d+ more ideas/ }).click();
  const sea = extras.getByRole("listitem").filter({ hasText: "Sea walking (helmet diving)" });
  await sea.getByRole("button", { name: "Add to my picks" }).click();
  await expect(sea.getByRole("radiogroup", { name: "Pick for Sea walking (helmet diving)" }).getByRole("radio", { name: "I'm in" })).toHaveAttribute("aria-checked", "true");

  // Picks are saved on the server.
  await page.reload();
  await expect(page.getByRole("radiogroup", { name: "Your pick for VinWonders Phu Quoc" }).getByRole("radio", { name: "Already done" })).toHaveAttribute("aria-checked", "true");

  // Everyone can see who's in.
  await page.getByRole("button", { name: "Who's in" }).click();
  const row = page.getByRole("row", { name: /VinWonders Phu Quoc/ });
  await expect(row.getByText("Done")).toBeVisible();
  await expect(page.getByRole("row", { name: /Sea walking/ })).toBeVisible();

  // Kiran's personal plan leaves VinWonders out and lists the extra pick.
  await page.getByRole("button", { name: "Personal plans" }).click();
  await expect(page.getByRole("heading", { name: "Kiran's plan" })).toBeVisible();
  await expect(page.getByText("Sitting out 2 activities")).toBeVisible();
  await expect(page.getByText("Extra picks waiting for a slot")).toBeVisible();
  await expect(page.getByText("VinWonders Phu Quoc", { exact: true })).toHaveCount(0);
  w.assertClean();

  // Subhash signs in and builds everyone's plans.
  const ctx = await browser.newContext();
  const owner = await ctx.newPage();
  const w2 = watchErrors(owner);
  await owner.goto("/login");
  await owner.getByLabel("Email").fill("subhash@atlas.local");
  await owner.getByLabel("Password").fill(E2E_ADMIN_PASSWORD);
  await owner.getByRole("button", { name: "Sign in" }).click();
  await expect(owner).not.toHaveURL(/login/);
  await owner.goto(`${tripUrl}?tab=plan`);
  await owner.getByRole("button", { name: "Preview changes" }).click();
  const dlg = owner.getByRole("dialog", { name: "Build personal plans" });
  await expect(dlg.getByText(/VinWonders Phu Quoc \(6 going\)/)).toBeVisible();
  await expect(dlg.getByText(/Sea walking \(helmet diving\) \(1 going, time to be set\)/)).toBeVisible();
  await dlg.getByRole("button", { name: "Apply to itinerary" }).click();
  await toast(owner, "Personal plans updated");

  // The extra pick is now on a Phu Quoc day in the itinerary, for Kiran only.
  await owner.goto("/trip");
  await expect(owner.getByText("Sea walking (helmet diving)").first()).toBeVisible();
  await expect(owner.getByText("1 going").first()).toBeVisible();
  w2.assertClean();
  await ctx.close();
});
