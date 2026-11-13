import path from "node:path";
import { expect, test } from "@playwright/test";
import { watchErrors, E2E_ADMIN_PASSWORD } from "./helpers";

test("Scenario 6: admin creates, sources, illustrates, prices and publishes an activity", async ({ page }) => {
  const w = watchErrors(page);
  await page.goto("/login?next=/admin");
  await page.getByLabel("Email").fill("admin@atlas.local");
  await page.getByLabel("Password").fill(E2E_ADMIN_PASSWORD);
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page).toHaveURL(/\/admin$/);
  await expect(page.getByRole("heading", { name: "Dashboard" })).toBeVisible();

  await page.goto("/admin/activities/new");
  await page.getByLabel("Title").fill("E2E Lantern night photo walk");
  await page.getByLabel("Destination").selectOption({ label: "Hoi An" });
  await page.getByLabel("Free / paid").selectOption("paid");
  await page.getByLabel(/^Summary/).fill("A guided evening photo walk through Hoi An's lantern-lit lanes and riverside.");
  await page.getByLabel("Description").fill("Join a local photographer for two hours of night photography in the Ancient Town, covering long exposures, lantern light and street portraits with permission.");
  await page.getByLabel("What you'll do (one per line)").fill("Practise low-light settings\nShoot lanterns on the river");
  await page.getByLabel("Step by step (one per line)").fill("Meet at the Japanese Bridge\nWalk the riverside\nReview photos over tea");
  await page.getByLabel("Duration text").fill("2 hours");
  await page.getByLabel("Safety notes (one per line)").fill("Watch for motorbikes in narrow lanes");
  await page.getByLabel("Photography").check();
  await page.getByLabel("Min (VND)").fill("500000");
  await page.getByLabel("Max (VND)").fill("700000");
  await page.getByLabel("Basis (how was this figure obtained?)").fill("Test record: illustrative estimate");
  // Publishing without sources is blocked
  await page.getByRole("button", { name: "Save & publish" }).click();
  await expect(page.getByRole("alert").filter({ hasText: /source/i }).first()).toBeVisible();
  await page.getByRole("button", { name: "Save draft" }).click();
  await expect(page).toHaveURL(/\/admin\/activities\/[0-9a-f-]{36}$/);

  // Add a source
  await page.getByLabel("Title", { exact: true }).nth(1).fill("Hoi An official tourism (test)");
  await page.getByLabel("URL", { exact: true }).fill("https://example.org/hoi-an");
  await page.getByLabel("Publisher").fill("Test publisher");
  await page.getByLabel("What was checked").fill("Price range");
  await page.getByRole("button", { name: "Add source" }).click();
  await expect(page.getByRole("link", { name: "Hoi An official tourism (test)" })).toBeVisible();

  // Add an image (generated test fixture)
  await page.getByLabel(/Image file/).setInputFiles(path.join(import.meta.dirname, "fixtures/test-image.jpg"));
  await page.getByLabel(/Alt text/).fill("Lanterns reflected in the Thu Bon river at night");
  await page.getByLabel("Licence").fill("Test fixture");
  await page.getByRole("button", { name: "Upload image" }).click();
  const uploaded = page.getByRole("img", { name: "Lanterns reflected in the Thu Bon river at night" });
  await expect(uploaded).toBeVisible();
  // The file is served immediately by the production server (uploads live outside public/).
  await expect.poll(() => uploaded.evaluate((img: HTMLImageElement) => img.complete && img.naturalWidth > 0)).toBe(true);

  // Publish
  await page.getByRole("button", { name: "Save & publish" }).click();
  await expect(page.getByText("Status: published").or(page.getByRole("status").filter({ hasText: "Activity saved" })).first()).toBeVisible();

  // Visible on the public destination page and detail page
  await page.goto("/experiences?destination=hoi-an&q=lantern%20night%20photo");
  await expect(page.getByRole("link", { name: "E2E Lantern night photo walk" })).toBeVisible();
  await page.getByRole("link", { name: "E2E Lantern night photo walk" }).click();
  await expect(page.getByRole("heading", { level: 1, name: "E2E Lantern night photo walk" })).toBeVisible();

  // Audit trail
  await page.goto("/admin/audit");
  await expect(page.getByRole("cell", { name: /Created activity “E2E Lantern night photo walk”/ })).toBeVisible();
  w.assertClean();
});

test("non-admins cannot open the admin area", async ({ page }) => {
  await page.goto("/admin");
  await expect(page).toHaveURL(/\/login/);
});
