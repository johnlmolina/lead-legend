/**
 * Seeds a handful of realistic sample leads for local viewing/testing.
 * Requires an explicit target — guessing "the right" organization in a
 * database that may also contain test fixtures is exactly how demo data
 * ends up in the wrong place. Run with:
 *   npm run db:seed -- --email=you@example.com
 *   npm run db:seed -- --org-id=<uuid>
 */
import { config } from "dotenv";
config({ path: ".env.local", quiet: true });

import { createClient } from "@supabase/supabase-js";

const SAMPLE_LEADS = [
  { name: "Maria Gonzalez", phone: "+15035550101", email: "maria.g@example.com", status: "new", source: "website" },
  { name: "James Carter", phone: "+15035550102", email: "jcarter@example.com", status: "contacted", source: "referral" },
  { name: "Aisha Patel", phone: "+15035550103", status: "engaged", source: "google_ads" },
  { name: "Wei Chen", phone: "+15035550104", email: "wei.chen@example.com", status: "qualified", source: "website" },
  { name: "Sofia Rossi", phone: "+15035550105", status: "appointment_booked", source: "referral" },
  { name: "Daniel Kim", phone: "+15035550106", email: "dkim@example.com", status: "appointment_completed", source: "google_ads" },
  { name: "Priya Nair", phone: "+15035550107", status: "won", source: "website" },
  { name: "Lucas Alvarez", phone: "+15035550108", status: "lost", source: "referral" },
  { name: "Emma Johnson", phone: "+15035550109", status: "do_not_contact", source: "website" },
  { name: "Noah Brown", phone: "+15035550110", email: "noah.b@example.com", status: "new", source: "missed_call" },
];

function readArg(name: string): string | undefined {
  return process.argv.find((a) => a.startsWith(`--${name}=`))?.split("=").slice(1).join("=");
}

async function main() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error("NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set in .env.local");
  }

  const admin = createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } });

  const orgIdArg = readArg("org-id");
  const emailArg = readArg("email");

  let organizationId = orgIdArg;
  let organizationName: string | undefined;

  if (!organizationId && emailArg) {
    const { data: listData, error: listError } = await admin.auth.admin.listUsers();
    if (listError) throw listError;
    const user = listData.users.find((u) => u.email === emailArg);
    if (!user) {
      throw new Error(`No user found with email ${emailArg}`);
    }
    const { data: membership, error: membershipError } = await admin
      .from("organization_members")
      .select("organization_id, organizations(name)")
      .eq("user_id", user.id)
      .maybeSingle();
    if (membershipError) throw membershipError;
    if (!membership) {
      throw new Error(`${emailArg} doesn't belong to any organization yet — complete onboarding first.`);
    }
    organizationId = membership.organization_id;
    const org = Array.isArray(membership.organizations) ? membership.organizations[0] : membership.organizations;
    organizationName = org?.name;
  }

  if (!organizationId) {
    const { data: orgs } = await admin.from("organizations").select("id, name").order("name");
    console.error("Usage: npm run db:seed -- --email=you@example.com  (or --org-id=<uuid>)");
    console.error("\nOrganizations currently in the database:");
    for (const org of orgs ?? []) {
      console.error(`  ${org.id}  ${org.name}`);
    }
    process.exit(1);
  }

  console.log(`Seeding into organization: ${organizationName ?? organizationId}`);

  const { error } = await admin.from("leads").insert(
    SAMPLE_LEADS.map((lead) => ({ ...lead, organization_id: organizationId }))
  );
  if (error) throw error;

  console.log(`Seeded ${SAMPLE_LEADS.length} sample leads.`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
