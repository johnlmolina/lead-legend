import { test, expect } from "@playwright/test";
import { createTestOrganization, cleanupTestOrganization, type TestOrgFixture } from "../tests/helpers/supabase-admin";

test.describe("conversations", () => {
  let fixture: TestOrgFixture;

  test.beforeAll(async () => {
    fixture = await createTestOrganization("e2e-conversations");
  });

  test.afterAll(async () => {
    await cleanupTestOrganization(fixture);
  });

  test.beforeEach(async ({ page }, testInfo) => {
    // The fixture organization persists across tests in this file, so each
    // test needs its own uniquely-named lead — reusing one name causes
    // ambiguous "getByRole('link', ...)" matches by the second test.
    const leadName = `Conversation Test Lead ${testInfo.testId}`;

    await page.goto("/login");
    await page.getByLabel("Email").fill(fixture.email);
    await page.getByLabel("Password").fill(fixture.password);
    await page.getByRole("button", { name: /log in/i }).click();
    await expect(page).toHaveURL(/\/dashboard$/);

    await page.getByRole("link", { name: "Leads" }).click();
    await page.getByRole("link", { name: "Add a lead" }).click();
    await page.getByLabel("Name").fill(leadName);
    await page.getByLabel("Phone", { exact: false }).fill("5559990000");
    await page.getByRole("button", { name: /add lead/i }).click();
    await page.getByRole("link", { name: leadName }).click();
    await expect(page.getByRole("heading", { name: leadName })).toBeVisible();
  });

  test("sending a message adds it to the thread as an outbound message", async ({ page }) => {
    await page.getByPlaceholder("Write a message…").fill("Thanks for reaching out!");
    await page.getByRole("button", { name: "Send" }).click();

    await expect(page.getByText("Thanks for reaching out!")).toBeVisible();
    await expect(page.getByText("You ·").first()).toBeVisible();
  });

  test("simulating an inbound message adds it as from the lead", async ({ page }) => {
    await page.getByPlaceholder("What the lead would text back…").fill("Yes, I'm interested!");
    await page.getByRole("button", { name: "Simulate" }).click();

    await expect(page.getByText("Yes, I'm interested!")).toBeVisible();
    await expect(page.getByText("Lead ·").first()).toBeVisible();
  });

  test("messages appear in chronological order", async ({ page }) => {
    await page.getByPlaceholder("Write a message…").fill("Message one");
    await page.getByRole("button", { name: "Send" }).click();
    await expect(page.getByText("Message one")).toBeVisible();

    await page.getByPlaceholder("What the lead would text back…").fill("Message two");
    await page.getByRole("button", { name: "Simulate" }).click();
    await expect(page.getByText("Message two")).toBeVisible();

    await page.getByPlaceholder("Write a message…").fill("Message three");
    await page.getByRole("button", { name: "Send" }).click();
    await expect(page.getByText("Message three")).toBeVisible();

    const bodies = await page.locator("ol li p.mt-1").allTextContents();
    expect(bodies).toEqual(["Message one", "Message two", "Message three"]);
  });

  test("cannot send a message to a lead marked Do Not Contact", async ({ page }) => {
    await page.getByRole("combobox").selectOption("do_not_contact");
    await expect(page.getByText("Do not contact", { exact: true })).toBeVisible();

    await page.getByPlaceholder("Write a message…").fill("This should be blocked");
    await page.getByRole("button", { name: "Send" }).click();

    await expect(page.getByText(/do not contact/i).last()).toBeVisible();
    await expect(page.getByText("This should be blocked")).not.toBeVisible();
  });
});
