"use server";

import { redirect } from "next/navigation";
import { requireUser } from "@/lib/dal";

export type CreateOrganizationState = { error?: string } | undefined;

export async function createOrganization(
  _state: CreateOrganizationState,
  formData: FormData
): Promise<CreateOrganizationState> {
  const { supabase } = await requireUser();

  const name = formData.get("name");
  if (typeof name !== "string" || name.trim().length < 2) {
    return { error: "Company name must be at least 2 characters." };
  }

  // The on_organization_created trigger (see supabase/migrations/0001_init.sql)
  // atomically makes the current user the 'owner' member of the new org.
  const { error } = await supabase.from("organizations").insert({ name: name.trim() });

  if (error) {
    return { error: error.message };
  }

  redirect("/dashboard");
}
