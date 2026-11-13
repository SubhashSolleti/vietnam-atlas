import { expect, test } from "@playwright/test";
import { watchErrors } from "./helpers";

test("Scenario 1: first-time visitor discovers Phu Quoc and saves snorkelling", async ({ page }) => {
  const w = watchErrors(page);
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "Discover the Extraordinary Vietnam." })).toBeVisible();

  // Explore Vietnam
  await page.getByRole("link", { name: /Explore Vietnam/ }).first().click();
  await expect(page).toHaveURL(/\/explore$/);
  await expect(page.getByRole("heading", { name: "Southern Vietnam" })).toBeVisible();

  // Global search with autocomplete
  await page.getByRole("button", { name: /Search/ }).first().click();
  const combo = page.getByRole("combobox");
  await combo.fill("Phu Quoc");
  const option = page.getByRole("option", { name: /^Phu Quoc/ }).first();
  await expect(option).toBeVisible();
  await option.click();
  await expect(page).toHaveURL(/\/destinations\/phu-quoc$/);
  await expect(page.getByRole("heading", { level: 1, name: /Phu Quoc/ })).toBeVisible();

  // Browse water activities on the destination page
  const experiences = page.locator("#experiences");
  await experiences.scrollIntoViewIfNeeded();
  await experiences.getByRole("button", { name: /^Adventure/ }).click();
  const snorkel = experiences.getByRole("link", { name: /snorkel/i }).first();
  await expect(snorkel).toBeVisible();
  await snorkel.click();

  // Activity detail
  await expect(page).toHaveURL(/\/experiences\/phu-quoc-.*snorkel/);
  await expect(page.getByRole("heading", { level: 2, name: "Price, inclusions & booking" })).toBeVisible();
  await expect(page.getByText(/estimate/i).first()).toBeVisible();

  // Save it
  await page.getByRole("button", { name: "Save to wishlist" }).first().click();
  await expect(page.getByRole("button", { name: "Saved" }).first()).toBeVisible();
  await expect(page.getByRole("status").filter({ hasText: /^Saved “/ }).first()).toBeVisible();
  await page.goto("/wishlist");
  await expect(page.getByRole("link", { name: /snorkel/i }).first()).toBeVisible();
  w.assertClean();
});
