import { test, expect } from "@playwright/test";
import { createTestOrganization, cleanupTestOrganization, type TestOrgFixture } from "../tests/helpers/supabase-admin";

// Hits the real Anthropic API — skipped automatically if no key is
// configured, since CI/other machines running this suite may not have one.
const AI_CONFIGURED = Boolean(process.env.ANTHROPIC_API_KEY);

test.describe("AI drafting", () => {
  test.skip(!AI_CONFIGURED, "ANTHROPIC_API_KEY is not configured");

  let fixture: TestOrgFixture;

  test.beforeAll(async () => {
    fixture = await createTestOrganization("e2e-ai");
  });

  test.afterAll(async () => {
    await cleanupTestOrganization(fixture);
  });

  test("Suggest with AI drafts a reply and shows an interest assessment", async ({ page }) => {
    await page.goto("/login");
    await page.getByLabel("Email").fill(fixture.email);
    await page.getByLabel("Password").fill(fixture.password);
    await page.getByRole("button", { name: /log in/i }).click();
    await expect(page).toHaveURL(/\/dashboard$/);

    await page.getByRole("link", { name: "Leads" }).click();
    await page.getByRole("link", { name: "Add a lead" }).click();
    await page.getByLabel("Name").fill("AI Draft Test Lead");
    await page.getByLabel("Phone", { exact: false }).fill("5558880000");
    await page.getByRole("button", { name: /add lead/i }).click();
    await page.getByRole("link", { name: "AI Draft Test Lead" }).click();
    await expect(page.getByRole("heading", { name: "AI Draft Test Lead" })).toBeVisible();

    await page.getByRole("button", { name: /suggest with ai/i }).click();

    const messageInput = page.getByPlaceholder("Write a message…");
    await expect(async () => {
      expect((await messageInput.inputValue()).length).toBeGreaterThan(0);
    }).toPass({ timeout: 15_000 });

    // No pricing, insurance-coverage, or legal-advice language reached the
    // UI — the same deterministic filter tests/guardrails.test.ts covers in
    // isolation, verified here against a real model response end to end.
    const draft = await messageInput.inputValue();
    expect(draft).not.toMatch(/\$\s?\d/);

    await expect(page.getByText(/AI reads this lead as/i)).toBeVisible();
  });
});
