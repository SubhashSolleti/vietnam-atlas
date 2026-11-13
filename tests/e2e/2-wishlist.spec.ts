import { expect, test } from "@playwright/test";
import { watchErrors } from "./helpers";

test("Scenario 2: wishlist: save several, filter by price, compare, remove, persist", async ({ page }) => {
  const w = watchErrors(page);
  await page.goto("/experiences?destination=hanoi&tier=paid");
  const cards = page.locator("article");
  await expect(cards.first()).toBeVisible();
  const titles: string[] = [];
  for (let i = 0; i < 3; i++) {
    const card = cards.nth(i);
    titles.push((await card.getByRole("heading").textContent())!.trim());
    await card.getByRole("button", { name: /^Save .* to wishlist$/ }).click();
    await expect(card.getByRole("button", { name: /^Remove .* from wishlist$/ })).toBeVisible();
    // The button flips optimistically; the toast confirms the server saved it.
    await expect(page.getByRole("status").filter({ hasText: /^Saved/ }).last()).toBeVisible();
  }
  // a free one too
  await page.goto("/experiences?destination=hanoi&tier=free");
  await page.locator("article").first().getByRole("button", { name: /^Save .* to wishlist$/ }).click();
  await expect(page.locator("article").first().getByRole("button", { name: /^Remove .* from wishlist$/ })).toBeVisible();
  await expect(page.getByRole("status").filter({ hasText: /^Saved/ }).last()).toBeVisible();

  await page.goto("/wishlist");
  await expect(page.getByRole("heading", { name: "Saved for later" })).toBeVisible();
  await expect(page.locator("li").filter({ has: page.getByRole("checkbox", { name: /^Select / }) })).toHaveCount(4);

  // Filter by price: free
  await page.getByLabel("Price").selectOption("free");
  await expect(page.locator("li").filter({ has: page.getByRole("checkbox", { name: /^Select / }) })).toHaveCount(1);
  await page.getByLabel("Price").selectOption("");

  // Compare two
  await page.getByRole("checkbox", { name: `Select ${titles[0]}` }).check();
  await page.getByRole("checkbox", { name: `Select ${titles[1]}` }).check();
  await page.getByRole("button", { name: "Compare" }).click();
  await expect(page).toHaveURL(/\/wishlist\/compare/);
  await expect(page.getByRole("heading", { name: "Side by side" })).toBeVisible();
  await expect(page.getByRole("rowheader", { name: /Estimated price/ })).toBeVisible();
  await expect(page.getByRole("link", { name: titles[0]! }).first()).toBeVisible();

  // Remove one from wishlist
  await page.goto("/wishlist");
  await page.getByRole("checkbox", { name: `Select ${titles[2]}` }).check();
  await page.getByRole("button", { name: "Remove" }).first().click();
  await page.getByRole("dialog").getByRole("button", { name: "Remove" }).click();
  await expect(page.getByRole("checkbox", { name: `Select ${titles[2]}` })).toHaveCount(0);

  // Persist after refresh
  await page.reload();
  await expect(page.locator("li").filter({ has: page.getByRole("checkbox", { name: /^Select / }) })).toHaveCount(3);
  await expect(page.getByRole("link", { name: titles[0]! }).first()).toBeVisible();
  w.assertClean();
});
