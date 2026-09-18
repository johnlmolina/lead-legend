"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireOrganization } from "@/lib/dal";
import { canTransition, getForwardSteps, isLeadStatus } from "@/lib/lead-status";
import { parseLeadsCsv } from "@/lib/csv";
import type { SupabaseClient } from "@supabase/supabase-js";

export type LeadFormState = { error?: string } | undefined;

export async function createLead(
  _state: LeadFormState,
  formData: FormData
): Promise<LeadFormState> {
  const { supabase, membership } = await requireOrganization();

  const name = formData.get("name");
  const phone = formData.get("phone");
  const email = formData.get("email");
  const address = formData.get("address");

  if (typeof phone !== "string" || phone.trim().length < 7) {
    return { error: "A valid phone number is required." };
  }

  const { error } = await supabase.from("leads").insert({
    organization_id: membership.organization_id,
    name: typeof name === "string" && name.trim() ? name.trim() : null,
    phone: phone.trim(),
    email: typeof email === "string" && email.trim() ? email.trim() : null,
    address: typeof address === "string" && address.trim() ? address.trim() : null,
    source: "manual",
  });

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/dashboard/leads");
  revalidatePath("/dashboard");
  redirect("/dashboard/leads");
}

async function getCurrentStatus(supabase: SupabaseClient, leadId: string) {
  const { data: lead, error } = await supabase
    .from("leads")
    .select("status")
    .eq("id", leadId)
    .single();

  if (error || !lead) {
    throw new Error(error?.message ?? "Lead not found");
  }
  if (!isLeadStatus(lead.status)) {
    throw new Error(`Lead has an unrecognized status: ${lead.status}`);
  }
  return lead.status;
}

export async function updateLeadStatus(leadId: string, newStatus: string) {
  if (!isLeadStatus(newStatus)) {
    throw new Error(`Unknown lead status: ${newStatus}`);
  }

  const { supabase } = await requireOrganization();
  const currentStatus = await getCurrentStatus(supabase, leadId);

  if (!canTransition(currentStatus, newStatus)) {
    throw new Error(`Cannot move a lead from "${currentStatus}" to "${newStatus}".`);
  }

  const { error } = await supabase.from("leads").update({ status: newStatus }).eq("id", leadId);
  if (error) {
    throw new Error(error.message);
  }

  revalidatePath(`/dashboard/leads/${leadId}`);
  revalidatePath("/dashboard/leads");
  revalidatePath("/dashboard");
}

/**
 * For cases like the AI assessing a lead as "qualified" after a single
 * exchange: the single-step transition rules stay strict, but a lead that
 * already replied with clear interest has, in effect, already passed through
 * "contacted"/"engaged" — those conversations happened, they just weren't
 * clicked through one at a time. Walks the forward pipeline step by step
 * (each step individually valid, each one logged to lead_status_history by
 * the DB trigger) rather than weakening canTransition() itself. No-op if the
 * target isn't forward-reachable (e.g. it's "lost" or behind the current
 * status) — callers should fall back to updateLeadStatus for those.
 */
export async function advanceLeadStatus(leadId: string, targetStatus: string) {
  if (!isLeadStatus(targetStatus)) {
    throw new Error(`Unknown lead status: ${targetStatus}`);
  }

  const { supabase } = await requireOrganization();
  const currentStatus = await getCurrentStatus(supabase, leadId);
  const steps = getForwardSteps(currentStatus, targetStatus);

  if (steps.length === 0) {
    throw new Error(`Cannot advance a lead from "${currentStatus}" to "${targetStatus}".`);
  }

  for (const step of steps) {
    const { error } = await supabase.from("leads").update({ status: step }).eq("id", leadId);
    if (error) throw new Error(error.message);
  }

  revalidatePath(`/dashboard/leads/${leadId}`);
  revalidatePath("/dashboard/leads");
  revalidatePath("/dashboard");
}

export type ImportLeadsState =
  | { error?: string; imported?: number; skipped?: number }
  | undefined;

export async function importLeadsCsv(
  _state: ImportLeadsState,
  formData: FormData
): Promise<ImportLeadsState> {
  const { supabase, membership } = await requireOrganization();

  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return { error: "Choose a CSV file to import." };
  }

  const text = await file.text();
  const { rows, skipped } = parseLeadsCsv(text);

  if (rows.length === 0) {
    return { error: "No valid rows found. Each row needs at least a phone number." };
  }

  const { error } = await supabase.from("leads").insert(
    rows.map((row) => ({
      organization_id: membership.organization_id,
      name: row.name ?? null,
      phone: row.phone,
      email: row.email ?? null,
      address: row.address ?? null,
      source: "import",
    }))
  );

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/dashboard/leads");
  revalidatePath("/dashboard");
  return { imported: rows.length, skipped };
}
