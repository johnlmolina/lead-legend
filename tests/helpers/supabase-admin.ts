import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/**
 * Test-only service-role client. Used to create/tear down fixture users and
 * organizations directly, bypassing RLS and email confirmation — never
 * import this outside the test suite.
 */
export function adminClient(): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error(
      "NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set (in .env.local) to run this test suite against your Supabase project."
    );
  }
  return createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } });
}

/** Anon client, for signing in as a specific test user under RLS. */
export function anonClient(): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) {
    throw new Error("NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY must be set.");
  }
  return createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } });
}

export type TestOrgFixture = {
  userId: string;
  email: string;
  password: string;
  organizationId: string;
};

/**
 * Creates a confirmed test user and an organization owned by them (via the
 * on_organization_created trigger). Returns everything needed to sign in as
 * that user and know which organization they own.
 */
export async function createTestOrganization(label: string): Promise<TestOrgFixture> {
  const admin = adminClient();
  const email = `test-${label}-${Date.now()}-${Math.random().toString(36).slice(2)}@example.com`;
  const password = `Test-Password-${Math.random().toString(36).slice(2)}!1`;

  const { data: userData, error: userError } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });
  if (userError || !userData.user) {
    throw new Error(`Failed to create test user: ${userError?.message}`);
  }

  const signedInAs = anonClient();
  const { error: signInError } = await signedInAs.auth.signInWithPassword({ email, password });
  if (signInError) {
    throw new Error(`Failed to sign in as test user: ${signInError.message}`);
  }

  const orgName = `Test Org ${label} ${Date.now()}`;

  // Deliberately NOT chaining .select() on this insert: the RETURNING clause's
  // own RLS check runs against the row before the on_organization_created
  // trigger's membership insert is visible to it, so `INSERT ... RETURNING`
  // fails RLS even though the insert itself is allowed. A plain insert,
  // followed by a separate select (a fresh statement, which does see the
  // trigger's committed effect), avoids the race. The app's own
  // createOrganization action already does it this way; this mirrors that.
  //
  // Retried on "JWT issued at future": an intermittent clock-skew rejection
  // seen in CI (fresh runner VMs occasionally haven't finished NTP sync the
  // instant a just-issued token is first used), never seen locally. The
  // token's iat doesn't change on retry — real time passing is what clears
  // it, so a short delay and another attempt with the same session resolves
  // it rather than needing a fresh sign-in.
  let insertError: { message: string } | null = null;
  for (let attempt = 1; attempt <= 3; attempt++) {
    ({ error: insertError } = await signedInAs.from("organizations").insert({ name: orgName }));
    if (!insertError || !insertError.message.includes("JWT issued at future")) break;
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  if (insertError) {
    throw new Error(`Failed to create test organization: ${insertError.message}`);
  }

  const { data: org, error: selectError } = await signedInAs
    .from("organizations")
    .select("id")
    .eq("name", orgName)
    .single();
  if (selectError || !org) {
    throw new Error(`Failed to read back test organization: ${selectError?.message}`);
  }

  return { userId: userData.user.id, email, password, organizationId: org.id };
}

export async function cleanupTestOrganization(fixture: TestOrgFixture) {
  const admin = adminClient();
  // organization_members cascades from auth.users, but the organization row
  // itself doesn't — delete it explicitly so test runs don't accumulate junk.
  await admin.from("organizations").delete().eq("id", fixture.organizationId);
  await admin.auth.admin.deleteUser(fixture.userId);
}
