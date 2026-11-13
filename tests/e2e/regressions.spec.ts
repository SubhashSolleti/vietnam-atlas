import { expect, test } from "@playwright/test";

test.describe("UI regressions", () => {
  test("search box keeps every character when typing with pauses", async ({ page }) => {
    await page.goto("/experiences");
    const box = page.getByRole("searchbox").first();
    await box.click();
    for (const word of ["floating ", "market ", "boat"]) {
      await box.pressSequentially(word, { delay: 120 });
      await page.waitForTimeout(500); // longer than the debounce
    }
    await expect(box).toHaveValue("floating market boat");
    await expect(page).toHaveURL(/q=floating(\+|%20)market(\+|%20)boat/);
  });

  test("Save from a stale tab saves instead of removing", async ({ browser }) => {
    const ctx = await browser.newContext();
    const a = await ctx.newPage();
    const b = await ctx.newPage();
    const url = "/experiences/can-tho-cai-rang-floating-market";
    await a.goto(url);
    await b.goto(url);
    await a.getByRole("button", { name: /^Save .* to wishlist$/ }).first().click();
    await expect(a.getByRole("status").filter({ hasText: /^Saved/ }).first()).toBeVisible();
    // Tab B still shows "Save"; clicking it must keep the item saved.
    await b.getByRole("button", { name: /^Save .* to wishlist$/ }).first().click();
    await expect(b.getByRole("status").filter({ hasText: /^Saved/ }).first()).toBeVisible();
    // Both clicks meant "save": the item is saved once, not saved then removed.
    await a.goto("/wishlist");
    await expect(a.getByRole("tab", { name: /All saved\s*1/ })).toBeVisible();
    await ctx.close();
  });

  test("suggested route never adds transfers outside the trip dates", async ({ page }) => {
    await page.goto("/group/new");
    await page.getByLabel("Trip name").fill("Spring weekend");
    await page.getByLabel("Your name").fill("Asha");
    await page.getByLabel("Start date").fill("2027-03-01");
    await page.getByLabel("End date").fill("2027-03-04");
    await page.getByRole("button", { name: /Create trip/ }).click();
    await page.waitForURL(/\/group\/[0-9a-f-]{36}/);
    await page.goto("/trip");
    await page.getByRole("button", { name: "Suggest a route" }).click();
    await page.getByRole("dialog").getByRole("button", { name: "Apply suggestion" }).click();
    await expect(page.getByRole("alert").filter({ hasText: /overlap your trip dates/ })).toBeVisible();
  });

  test("register form keeps name and email after a server error", async ({ page }) => {
    await page.goto("/register");
    await page.getByLabel("Your name").fill("QA Person");
    await page.getByLabel("Email").fill("admin@atlas.local");
    await page.getByLabel("Password").fill("longenoughpassword1");
    await page.getByRole("button", { name: "Create account" }).click();
    await expect(page.getByRole("alert").filter({ hasText: /already exists/ })).toBeVisible();
    await expect(page.getByLabel("Your name")).toHaveValue("QA Person");
    await expect(page.getByLabel("Email")).toHaveValue("admin@atlas.local");
  });

  test("an out-of-range page number shows the last page, not an empty list", async ({ page }) => {
    await page.goto("/experiences?page=999");
    await expect(page.getByText("No experiences match")).toHaveCount(0);
    await expect(page.getByRole("article").first()).toBeVisible();
  });
});
