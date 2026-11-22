import path from "node:path";
import { expect, test, type Page } from "@playwright/test";
import { E2E_ADMIN_PASSWORD, toast, watchErrors } from "./helpers";

const column = (page: Page, name: RegExp) => page.locator("section[id^=col-]").filter({ has: page.locator("header", { hasText: name }) });

test("Scenario 7: the owner attaches the base plan, travellers make their own boards, the owner builds personal plans", async ({ page, browser }) => {
  // Subhash signs in and attaches his itinerary PDF.
  const ownerCtx = await browser.newContext();
  const owner = await ownerCtx.newPage();
  const wo = watchErrors(owner);
  await owner.goto("/login");
  await owner.getByLabel("Email").fill("subhash@atlas.local");
  await owner.getByLabel("Password").fill(E2E_ADMIN_PASSWORD);
  await owner.getByRole("button", { name: "Sign in" }).click();
  await expect(owner).not.toHaveURL(/login/);
  await owner.goto("/group");
  await expect(owner).toHaveURL(/\/group\/[0-9a-f-]+/);
  const tripUrl = owner.url().split("?")[0]!;
  await owner.goto(`${tripUrl}?tab=plan`);
  await owner.getByLabel("Itinerary PDF file").setInputFiles(path.join(import.meta.dirname, "fixtures/base-plan.pdf"));
  await toast(owner, "Itinerary PDF attached");
  await expect(owner.getByText("Subhash's itinerary (base plan)")).toBeVisible();
  // Members get the PDF itself, with a policy the browser's PDF viewer accepts; outsiders get nothing.
  const tripId = tripUrl.split("/").pop()!;
  const pdf = await owner.request.get(`/api/trips/${tripId}/base-plan`);
  expect(pdf.status()).toBe(200);
  expect(pdf.headers()["content-type"]).toBe("application/pdf");
  expect(pdf.headers()["content-security-policy"]).toContain("object-src 'self'");
  expect((await pdf.body()).subarray(0, 5).toString()).toBe("%PDF-");
  const stranger = await browser.newContext();
  expect((await stranger.request.get(`/api/trips/${tripId}/base-plan`)).status()).toBe(401);
  await stranger.close();

  // Two cousins join at the same time with just their names: no seats, no accounts.
  const w = watchErrors(page);
  const otherCtx = await browser.newContext();
  const other = await otherCtx.newPage();
  await Promise.all([page.goto("/join/COUSINS26"), other.goto("/join/COUSINS26")]);
  await expect(page.getByRole("radio")).toHaveCount(0);
  await page.getByLabel(/Your name/).fill("Kiran");
  await other.getByLabel(/Your name/).fill("Meena");
  await Promise.all([page.getByRole("button", { name: "Join trip" }).click(), other.getByRole("button", { name: "Join trip" }).click()]);
  await expect(page).toHaveURL(/tab=plan/);
  await expect(other).toHaveURL(/tab=plan/);
  // Subhash, Kiran and Meena (plus Asha when scenario 4 ran first).
  await expect(page.getByText(/^[34]\/7 joined$/)).toBeVisible();
  await otherCtx.close();

  // Kiran's board starts as the base plan, with the booked flights and the PDF.
  await expect(page.getByRole("button", { name: "Board", exact: true })).toHaveAttribute("aria-pressed", "true");
  await expect(page.getByText("Fly Phu Quoc → Ho Chi Minh City (10:35 to 11:45)")).toBeVisible();
  const day2 = column(page, /Day 2 ·/);
  const vin = day2.locator("article").filter({ hasText: "VinWonders Phu Quoc" });
  await expect(vin).toBeVisible();
  // Not joined yet counts as going: 7 of 7.
  await expect(vin.getByText("Everyone going")).toBeVisible();

  // The PDF opens on the page where Day 2 starts.
  await day2.getByRole("button", { name: /Day 2 in the itinerary PDF, page 2/ }).click();
  const viewer = page.getByRole("dialog", { name: "Day 2 in the itinerary" });
  await expect(viewer.getByText("opened at page 2")).toBeVisible();
  await expect(viewer.getByRole("img", { name: "Page 2" })).toBeVisible();
  await viewer.getByRole("button", { name: "Close" }).click();

  // Already done VinWonders (button), skipping the Kiss of the Sea show (drag to Not doing).
  await vin.getByRole("button", { name: "Done before" }).click();
  const out = column(page, /Not doing/);
  await expect(out.locator("article").filter({ hasText: "VinWonders Phu Quoc" }).getByText("Already done")).toBeVisible();
  await expect(day2.getByText("VinWonders Phu Quoc")).toHaveCount(0);
  const show = page.locator("article").filter({ hasText: "Kiss of the Sea show" });
  await show.getByRole("button", { name: "Move Kiss of the Sea show" }).focus();
  await page.keyboard.press("Space");
  await page.keyboard.press("Escape"); // keyboard drag works and can be cancelled
  await show.getByRole("button", { name: "Skip" }).click();
  await expect(out.locator("article").filter({ hasText: "Kiss of the Sea show" }).getByText("Skipping")).toBeVisible();

  // Ideas: already done sea walking; add parasailing to Day 2 with the buttons; drag jet skiing onto Day 1.
  const ideas = column(page, /^Ideas/);
  const placeSelect = ideas.getByLabel("Place");
  await placeSelect.selectOption((await placeSelect.locator("option", { hasText: "Phu Quoc" }).getAttribute("value"))!);
  await ideas.getByLabel("Search ideas").fill("Sea walking");
  await ideas.locator("article").filter({ hasText: "Sea walking (helmet diving)" }).getByRole("button", { name: "Done before" }).click();
  await expect(out.getByText("Sea walking (helmet diving)")).toBeVisible();
  await ideas.getByLabel("Search ideas").fill("Parasailing");
  const addTo = ideas.locator("article").filter({ hasText: "Parasailing" }).getByLabel("Add Parasailing to a day");
  await addTo.selectOption((await addTo.locator("option", { hasText: "Day 2 ·" }).getAttribute("value"))!);
  await expect(day2.locator("article").filter({ hasText: "Parasailing" }).getByText("Your pick")).toBeVisible();

  await ideas.getByLabel("Search ideas").fill("Jet skiing");
  const jet = ideas.locator("article").filter({ hasText: "Jet skiing" }).getByRole("button", { name: "Move Jet skiing" });
  const day1 = column(page, /Day 1 ·/);
  await jet.hover();
  await page.mouse.down();
  const target = (await day1.boundingBox())!;
  await page.mouse.move(target.x + target.width / 2, target.y + 120, { steps: 12 });
  await page.mouse.move(target.x + target.width / 2, target.y + 140, { steps: 4 });
  await page.mouse.up();
  await expect(day1.locator("article").filter({ hasText: "Jet skiing" }).getByText("Your pick")).toBeVisible();

  // Picks are saved on the server.
  await page.reload();
  await expect(column(page, /Not doing/).getByText("VinWonders Phu Quoc")).toBeVisible();
  await expect(column(page, /Day 1 ·/).getByRole("link", { name: "Jet skiing" })).toBeVisible();

  // Everyone can see each other's boards.
  await page.getByLabel("Board of").selectOption({ label: "Subhash" });
  await expect(page.getByText(/You're looking at Subhash's board/)).toBeVisible();
  await expect(column(page, /Day 2 ·/).getByRole("button", { name: "Done before" })).toHaveCount(0);
  await page.getByRole("button", { name: "Who's in" }).click();
  await expect(page.getByRole("row", { name: /VinWonders Phu Quoc/ }).getByText("Done")).toBeVisible();

  // Kiran's personal plan leaves VinWonders out and shows the extra picks on their days.
  await page.getByRole("button", { name: "Personal plans" }).click();
  await expect(page.getByRole("heading", { name: "Kiran's plan" })).toBeVisible();
  await expect(page.getByText("Sitting out 2 activities")).toBeVisible();
  await expect(page.getByText("Parasailing")).toBeVisible();
  await expect(page.getByText("VinWonders Phu Quoc", { exact: true })).toHaveCount(0);
  w.assertClean();

  // Subhash builds everyone's plans: the five not joined yet still count as going.
  await owner.goto(`${tripUrl}?tab=plan`);
  await expect(owner.getByText(/[34] of 7 have joined/).first()).toBeVisible();
  await owner.getByRole("button", { name: "Preview changes" }).click();
  const dlg = owner.getByRole("dialog", { name: "Build personal plans" });
  await expect(dlg.getByText(/VinWonders Phu Quoc \(6 of 7 going: everyone except Kiran\)/)).toBeVisible();
  await expect(dlg.getByText(/Parasailing \(1 of 7: Kiran\)/)).toBeVisible();
  await expect(dlg.getByText(/count as going to the base plan/)).toBeVisible();
  // Placed on a Phu Quoc day with room in Kiran's own plan (the chosen day when it fits: see the unit tests).
  await expect(dlg.getByText(/(Sat 12|Sun 13|Mon 14) Dec: Parasailing/)).toBeVisible();
  await dlg.getByRole("button", { name: "Apply to itinerary" }).click();
  await toast(owner, "Personal plans updated");
  // Running it again changes nothing: Kiran's extra pick stays Kiran's, it doesn't become everyone's.
  await owner.getByRole("button", { name: "Preview changes" }).click();
  await expect(dlg.getByText("The itinerary already matches everyone's picks.")).toBeVisible();
  await dlg.getByRole("button", { name: "Cancel" }).click();

  // The extra picks are in the itinerary, for Kiran only.
  await owner.goto("/trip");
  await expect(owner.getByText("Parasailing").first()).toBeVisible();
  await expect(owner.getByText("1 going").first()).toBeVisible();
  wo.assertClean();
  await ownerCtx.close();
});
