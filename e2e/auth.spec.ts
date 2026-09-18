import { test, expect } from "@playwright/test";
import {
  createTestOrganization,
  cleanupTestOrganization,
  type TestOrgFixture,
} from "../tests/helpers/supabase-admin";
import { adminClient } from "../tests/helpers/supabase-admin";

// Signup's email-confirmation step can't be driven end-to-end without a real
// inbox, so these tests seed already-confirmed users via the Supabase admin
// API (see tests/helpers/supabase-admin.ts) and exercise login, onboarding,
// and profile updates against the real app + real Supabase project.

test.describe("login and onboarding", () => {
  let confirmedUserWithoutOrg: { email: string; password: string; userId: string };

  test.beforeAll(async () => {
    const admin = adminClient();
    const email = `e2e-${Date.now()}@example.com`;
    const password = `Test-Password-${Math.random().toString(36).slice(2)}!1`;
    const { data, error } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    });
    if (error || !data.user) throw new Error(`Failed to seed user: ${error?.message}`);
    confirmedUserWithoutOrg = { email, password, userId: data.user.id };
  });

  test.afterAll(async () => {
    const admin = adminClient();
    // The test creates an organization through the real onboarding UI, not
    // through createTestOrganization() — clean it up too, or it leaks a
    // stray "Playwright Roofing Co" row on every run.
    const { data: membership } = await admin
      .from("organization_members")
      .select("organization_id")
      .eq("user_id", confirmedUserWithoutOrg.userId)
      .maybeSingle();
    if (membership) {
      await admin.from("organizations").delete().eq("id", membership.organization_id);
    }
    await admin.auth.admin.deleteUser(confirmedUserWithoutOrg.userId);
  });

  test("logging in with no organization redirects to onboarding, and creating one lands on the dashboard", async ({
    page,
  }) => {
    await page.goto("/login");
    await page.getByLabel("Email").fill(confirmedUserWithoutOrg.email);
    await page.getByLabel("Password").fill(confirmedUserWithoutOrg.password);
    await page.getByRole("button", { name: /log in/i }).click();

    await expect(page).toHaveURL(/\/onboarding/);

    await page.getByLabel("Company name").fill("Playwright Roofing Co");
    await page.getByRole("button", { name: /continue/i }).click();

    await expect(page).toHaveURL(/\/dashboard/);
    await expect(
      page.getByRole("heading", { name: "Welcome to Playwright Roofing Co" })
    ).toBeVisible();
  });
});

test.describe("existing organization", () => {
  let fixture: TestOrgFixture;

  test.beforeAll(async () => {
    fixture = await createTestOrganization("e2e-existing");
  });

  test.afterAll(async () => {
    await cleanupTestOrganization(fixture);
  });

  test("logging in with an existing organization goes straight to the dashboard", async ({
    page,
  }) => {
    await page.goto("/login");
    await page.getByLabel("Email").fill(fixture.email);
    await page.getByLabel("Password").fill(fixture.password);
    await page.getByRole("button", { name: /log in/i }).click();

    await expect(page).toHaveURL(/\/dashboard$/);
  });

  test("profile page shows the account email and allows updating the name", async ({ page }) => {
    await page.goto("/login");
    await page.getByLabel("Email").fill(fixture.email);
    await page.getByLabel("Password").fill(fixture.password);
    await page.getByRole("button", { name: /log in/i }).click();
    await expect(page).toHaveURL(/\/dashboard$/);

    await page.getByRole("link", { name: "Profile" }).click();
    await expect(page.getByText(fixture.email)).toBeVisible();

    await page.getByLabel("Full name").fill("Updated Name");
    await page.getByRole("button", { name: /save changes/i }).click();
    await expect(page.getByText("Saved")).toBeVisible();
  });
});

test.describe("forgot password", () => {
  test("submitting an email shows the check-your-email confirmation", async ({ page }) => {
    await page.goto("/forgot-password");
    await page.getByLabel("Email").fill("someone@example.com");
    await page.getByRole("button", { name: /send reset link/i }).click();
    await expect(page.getByText(/check your email/i)).toBeVisible();
  });
});
