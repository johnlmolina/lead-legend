"use server";

import { revalidatePath } from "next/cache";
import { requireOrganization } from "@/lib/dal";
import { getOrCreateConversation } from "@/lib/conversations";
import { canSendToLead } from "@/lib/compliance";
import { sendSms, TWILIO_ENABLED } from "@/lib/twilio/client";

async function insertMessage(
  organizationId: string,
  supabase: Awaited<ReturnType<typeof requireOrganization>>["supabase"],
  leadId: string,
  body: string,
  direction: "inbound" | "outbound",
  sender: "human" | "lead"
) {
  const conversationId = await getOrCreateConversation(supabase, leadId, organizationId);

  const { error } = await supabase.from("messages").insert({
    conversation_id: conversationId,
    organization_id: organizationId,
    direction,
    sender,
    body,
  });
  if (error) throw new Error(error.message);

  revalidatePath(`/dashboard/leads/${leadId}`);
}

export type SendMessageResult = { delivered: boolean; note?: string };

/**
 * A staff member (or a staff-approved AI draft) sending a message to a lead.
 * This is the one place a real text can go out to a customer, so it's the
 * one place the compliance check (src/lib/compliance.ts) is non-negotiable —
 * a blocked send throws before anything is written to the conversation.
 */
export async function sendMessage(leadId: string, body: string): Promise<SendMessageResult> {
  const trimmed = body.trim();
  if (!trimmed) throw new Error("Message can't be empty.");

  const { supabase, membership } = await requireOrganization();

  const { data: lead, error: leadError } = await supabase
    .from("leads")
    .select("id, phone, opt_out_status, status")
    .eq("id", leadId)
    .eq("organization_id", membership.organization_id)
    .maybeSingle();
  if (leadError) throw new Error(leadError.message);
  if (!lead) throw new Error("Lead not found");

  const compliance = canSendToLead({ optOutStatus: lead.opt_out_status, status: lead.status });
  if (!compliance.allowed) {
    throw new Error(compliance.reason);
  }

  let delivered = false;
  let note: string | undefined;

  if (TWILIO_ENABLED) {
    const { data: organization } = await supabase
      .from("organizations")
      .select("phone_number")
      .eq("id", membership.organization_id)
      .single();

    if (!organization?.phone_number) {
      note = "No Twilio number configured for your organization yet — saved, but not sent.";
    } else {
      await sendSms(lead.phone, organization.phone_number, trimmed);
      delivered = true;
    }
  } else {
    note = "Twilio isn't configured yet — saved, but not sent as a real text.";
  }

  await insertMessage(membership.organization_id, supabase, leadId, trimmed, "outbound", "human");

  return { delivered, note };
}

/**
 * Dev/test tool only: simulates a lead texting in, so the conversation
 * thread can be exercised without needing a real inbound text. Never
 * presented to end customers as a real inbound channel. No compliance check
 * here — it's local test data, not a real send.
 */
export async function simulateInboundMessage(leadId: string, body: string) {
  const trimmed = body.trim();
  if (!trimmed) throw new Error("Message can't be empty.");

  const { supabase, membership } = await requireOrganization();

  const { data: lead, error: leadError } = await supabase
    .from("leads")
    .select("id")
    .eq("id", leadId)
    .eq("organization_id", membership.organization_id)
    .maybeSingle();
  if (leadError) throw new Error(leadError.message);
  if (!lead) throw new Error("Lead not found");

  await insertMessage(membership.organization_id, supabase, leadId, trimmed, "inbound", "lead");
}
