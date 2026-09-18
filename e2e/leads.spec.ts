import { test, expect } from "@playwright/test";
import { createTestOrganization, cleanupTestOrganization, type TestOrgFixture } from "../tests/helpers/supabase-admin";
import { writeFileSync, unlinkSync } from "node:fs";
import path from "node:path";
import os from "node:os";

test.describe("lead management", () => {
  let fixture: TestOrgFixture;

  test.beforeAll(async () => {
    fixture = await createTestOrganization("e2e-leads");
  });

  test.afterAll(async () => {
    await cleanupTestOrganization(fixture);
  });

  test.beforeEach(async ({ page }) => {
    await page.goto("/login");
    await page.getByLabel("Email").fill(fixture.email);
    await page.getByLabel("Password").fill(fixture.password);
    await page.getByRole("button", { name: /log in/i }).click();
    await expect(page).toHaveURL(/\/dashboard$/);
  });

  test("adding a lead shows it in the list and detail page", async ({ page }) => {
    await page.getByRole("link", { name: "Leads" }).click();
    await page.getByRole("link", { name: "Add a lead" }).click();

    await page.getByLabel("Name").fill("E2E Test Lead");
    await page.getByLabel("Phone", { exact: false }).fill("5551230000");
    await page.getByRole("button", { name: /add lead/i }).click();

    await expect(page).toHaveURL(/\/dashboard\/leads$/);
    await expect(page.getByRole("link", { name: "E2E Test Lead" })).toBeVisible();

    await page.getByRole("link", { name: "E2E Test Lead" }).click();
    await expect(page.getByRole("heading", { name: "E2E Test Lead" })).toBeVisible();
    await expect(page.getByText("5551230000")).toBeVisible();
  });

  test("only valid next statuses are offered, and a transition persists", async ({ page }) => {
    await page.getByRole("link", { name: "Leads" }).click();
    await page.getByRole("link", { name: "Add a lead" }).click();
    await page.getByLabel("Name").fill("Status Test Lead");
    await page.getByLabel("Phone", { exact: false }).fill("5551230001");
    await page.getByRole("button", { name: /add lead/i }).click();

    await page.getByRole("link", { name: "Status Test Lead" }).click();
    // getByRole("heading", ...) auto-retries until the client-side navigation
    // to the detail page actually lands; allTextContents() below does not, so
    // reading the <select> before this would race the navigation.
    await expect(page.getByRole("heading", { name: "Status Test Lead" })).toBeVisible();

    const select = page.getByRole("combobox");
    const optionTexts = await select.locator("option").allTextContents();
    expect(optionTexts.some((t) => t.includes("Contacted"))).toBe(true);
    expect(optionTexts.some((t) => t.includes("Won"))).toBe(false);

    await select.selectOption("contacted");
    await expect(page.getByText("Contacted", { exact: true }).first()).toBeVisible();
  });

  test("importing a CSV adds its rows as leads", async ({ page }) => {
    const csvPath = path.join(os.tmpdir(), `leads-${Date.now()}.csv`);
    writeFileSync(
      csvPath,
      "name,phone,email\nCSV Import Lead,5551230099,csvimport@example.com\nNo Phone Row,,skip@example.com\n"
    );

    try {
      await page.getByRole("link", { name: "Leads" }).click();
      await page.getByRole("link", { name: "Import CSV" }).click();

      await page.locator('input[type="file"]').setInputFiles(csvPath);
      await page.getByRole("button", { name: /^import$/i }).click();

      await expect(page.getByText(/imported 1 lead/i)).toBeVisible();
      await expect(page.getByText(/skipped 1/i)).toBeVisible();

      await page.getByRole("link", { name: "Back to leads" }).click();
      await expect(page.getByRole("link", { name: "CSV Import Lead" })).toBeVisible();
    } finally {
      unlinkSync(csvPath);
    }
  });
});
