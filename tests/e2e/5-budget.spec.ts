import { expect, test } from "@playwright/test";
import { watchErrors } from "./helpers";

/** Reads "₹12,345" style text into a number. */
const rupees = (s: string | null) => Number((s ?? "").replace(/[^\d]/g, ""));

test("Scenario 5: budget: target, stay, domestic travel, paid + optional experience", async ({ page }) => {
  const w = watchErrors(page);
  await page.goto("/group/new");
  await page.getByLabel("Trip name").fill("Budget Test Trip");
  await page.getByLabel("Your name (as the group will see it)").fill("Owner");
  await page.getByLabel("Start date").fill("2026-12-12");
  await page.getByLabel("End date").fill("2026-12-25");
  await page.getByLabel("Travellers").fill("7");
  await page.getByRole("button", { name: "Create trip" }).click();
  await expect(page).toHaveURL(/tab=members/);

  await page.goto("/trip/budget");
  // Make the maths exact: no daily estimates, no insurance/SIM/reserve.
  await page.getByRole("button", { name: "Adjust estimates" }).click();
  const s = page.getByRole("dialog");
  await s.getByLabel("Target budget per person (₹)").fill("65000");
  await s.getByLabel("Emergency reserve (%)").fill("0");
  await s.getByLabel("Travel insurance per person (₹)").fill("0");
  await s.getByLabel("SIM / eSIM per person (₹)").fill("0");
  for (const label of ["Accommodation", "Local transport", "Food & drink", "Shopping", "Miscellaneous"]) await s.getByLabel(label, { exact: true }).fill("0");
  await s.getByRole("button", { name: "Save" }).click();
  await expect(page.getByRole("status").filter({ hasText: "Budget settings saved" })).toBeVisible();

  const add = async (label: string, category: string, inr: string, mode: "per_person" | "total", participants?: number) => {
    await page.getByRole("button", { name: "Add expense" }).click();
    const d = page.getByRole("dialog");
    await d.getByLabel("Description").fill(label);
    await d.getByLabel("Category").selectOption(category);
    await d.getByLabel("Amount (₹)").fill(inr);
    await d.getByLabel("Amount is").selectOption(mode);
    await d.getByLabel(/Actual quote/).check();
    if (participants) {
      const boxes = d.getByRole("group", { name: /Participants/ }).getByRole("checkbox");
      const n = await boxes.count();
      for (let i = participants; i < n; i++) await boxes.nth(i).uncheck();
    }
    await d.getByRole("button", { name: "Save" }).click();
    await expect(page.getByRole("status").filter({ hasText: "Expense saved" }).last()).toBeVisible();
    await expect(page.getByRole("paragraph").filter({ hasText: new RegExp(`^${label.replace(/[()]/g, "\\$&")}$`) })).toBeVisible();
  };
  await add("Villa for 7, whole trip", "accommodation", "140000", "total");
  await add("Domestic flights", "domestic_flights", "6000", "per_person");
  await add("Lan Ha overnight cruise", "paid_activities", "8000", "per_person");
  await add("Fun dive (optional)", "paid_activities", "2000", "per_person", 5);

  // Per person: 20,000 + 6,000 + 8,000 (+2,000 for five) → group 238,000 + 10,000 = 248,000
  const group = page.locator("section[aria-label='Budget summary'] > div").nth(1);
  await expect(group).toContainText("₹2,48,000");
  const travellers = page.getByRole("heading", { name: "Per traveller" }).locator("..").getByRole("listitem");
  await expect(travellers).toHaveCount(7);
  const t1 = await travellers.nth(0).locator("p.font-semibold").textContent();
  const t7 = await travellers.nth(6).locator("p.font-semibold").textContent();
  expect(rupees(t1?.split("₫")[0]?.split(" ")[0] ?? "")).toBe(36000);
  expect(rupees(t7?.split("₫")[0]?.split(" ")[0] ?? "")).toBe(34000);
  await expect(travellers.nth(0)).toContainText("Left ₹29,000");
  w.assertClean();
});
