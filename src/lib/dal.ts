import "server-only";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

/**
 * Resolves the authenticated user's claims. Uses getClaims(), not
 * getUser()/getSession() — per Supabase's own guidance, getClaims()
 * validates the JWT signature locally on every call and is what should back
 * authorization decisions in server code.
 */
export async function requireUser() {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getClaims();
  if (error || !data?.claims) {
    redirect("/login");
  }
  return { supabase, claims: data.claims };
}

/**
 * Resolves the current user's organization membership. A user can belong to
 * more than one organization in principle; for Phase 2 we take the first
 * membership found. Redirects to /onboarding if the user has none yet.
 */
export async function requireOrganization() {
  const { supabase, claims } = await requireUser();

  const { data: membership, error } = await supabase
    .from("organization_members")
    .select("organization_id, role, organizations(id, name)")
    .eq("user_id", claims.sub)
    .limit(1)
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to resolve organization membership: ${error.message}`);
  }
  if (!membership) {
    redirect("/onboarding");
  }

  return { supabase, claims, membership };
}
