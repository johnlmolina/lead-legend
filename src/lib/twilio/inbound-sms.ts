import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { getOrCreateConversation } from "@/lib/conversations";
import { isStopKeyword, isStartKeyword } from "./opt-out";

/**
 * Handles one inbound SMS. Takes a service-role client (there's no user
 * session for an inbound webhook) — every query here does its own explicit
 * organization_id scoping since RLS doesn't apply. See
 * src/lib/supabase/service.ts for why that client is dangerous to use
 * anywhere else.
 *
 * Per the confirmed Phase 6 design, this never auto-replies — it just
 * ingests the message (and applies STOP/START) so staff can review and
 * reply via the existing "Suggest with AI" flow.
 */
export async function handleInboundSms(
  admin: SupabaseClient,
  params: { from: string; to: string; body: string }
): Promise<{ handled: boolean; reason?: string }> {
  const { data: organization, error: orgError } = await admin
    .from("organizations")
    .select("id")
    .eq("phone_number", params.to)
    .maybeSingle();

  if (orgError) throw new Error(orgError.message);
  if (!organization) {
    return { handled: false, reason: `No organization found for number ${params.to}` };
  }

  const { data: initialLead, error: leadError } = await admin
    .from("leads")
    .select("id, opt_out_status, status")
    .eq("organization_id", organization.id)
    .eq("phone", params.from)
    .maybeSingle();
  let lead = initialLead;
  if (leadError) throw new Error(leadError.message);

  if (!lead) {
    const { error: insertError } = await admin.from("leads").insert({
      organization_id: organization.id,
      phone: params.from,
      source: "sms",
      status: "new",
    });
    if (insertError) throw new Error(insertError.message);

    const { data: created, error: rereadError } = await admin
      .from("leads")
      .select("id, opt_out_status, status")
      .eq("organization_id", organization.id)
      .eq("phone", params.from)
      .single();
    if (rereadError || !created) throw new Error(rereadError?.message ?? "Failed to read back new lead");
    lead = created;
  }

  // START only means something for a lead who is currently opted out —
  // checking it against an already-subscribed lead's ordinary "yes" reply
  // would be a no-op anyway, but being explicit avoids any future code path
  // treating a normal conversational "yes" as a resubscribe event.
  if (lead.opt_out_status === "opted_out" && isStartKeyword(params.body)) {
    const { error } = await admin
      .from("leads")
      .update({ opt_out_status: "subscribed" })
      .eq("id", lead.id);
    if (error) throw new Error(error.message);
  } else if (isStopKeyword(params.body)) {
    const { error } = await admin
      .from("leads")
      .update({ opt_out_status: "opted_out" })
      .eq("id", lead.id);
    if (error) throw new Error(error.message);
  }

  if (lead.status === "new") {
    await admin.from("leads").update({ status: "contacted" }).eq("id", lead.id);
  }

  const conversationId = await getOrCreateConversation(admin, lead.id, organization.id);
  const { error: messageError } = await admin.from("messages").insert({
    conversation_id: conversationId,
    organization_id: organization.id,
    direction: "inbound",
    sender: "lead",
    body: params.body,
  });
  if (messageError) throw new Error(messageError.message);

  return { handled: true };
}
