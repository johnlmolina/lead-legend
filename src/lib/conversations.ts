import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Each lead has exactly one ongoing SMS conversation for now (multiple
 * channels/threads per lead isn't a Phase 4 requirement). Finds it or
 * creates it — callers don't need to care which happened.
 */
export async function getOrCreateConversation(
  supabase: SupabaseClient,
  leadId: string,
  organizationId: string
): Promise<string> {
  const { data: existing, error: findError } = await supabase
    .from("conversations")
    .select("id")
    .eq("lead_id", leadId)
    .eq("channel", "sms")
    .maybeSingle();

  if (findError) {
    throw new Error(`Failed to look up conversation: ${findError.message}`);
  }
  if (existing) {
    return existing.id;
  }

  // Deliberately not chaining .select() on this insert: the SELECT policy
  // needed for RETURNING can race the same way it did for organizations in
  // Phase 2 (see tests/helpers/supabase-admin.ts) if any trigger ever gets
  // added here. Insert plain, then read back.
  const { error: insertError } = await supabase
    .from("conversations")
    .insert({ lead_id: leadId, organization_id: organizationId, channel: "sms" });
  // 23505 = unique_violation: lost a race against a concurrent caller (e.g. a
  // Phase 6 inbound webhook firing at the same time as a staff action) — the
  // conversation now exists either way, so fall through to reading it back.
  if (insertError && insertError.code !== "23505") {
    throw new Error(`Failed to create conversation: ${insertError.message}`);
  }

  const { data: created, error: rereadError } = await supabase
    .from("conversations")
    .select("id")
    .eq("lead_id", leadId)
    .eq("channel", "sms")
    .single();
  if (rereadError || !created) {
    throw new Error(`Failed to read back new conversation: ${rereadError?.message}`);
  }

  return created.id;
}
