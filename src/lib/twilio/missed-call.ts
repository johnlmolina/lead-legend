import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { canSendToLead } from "@/lib/compliance";
import { sendSms, TWILIO_ENABLED } from "./client";

export type DialCallStatus = "completed" | "busy" | "no-answer" | "failed" | "canceled";

/**
 * Runs after a <Dial> attempt to the owner's cell finishes (see
 * app/api/webhooks/twilio/voice/status/route.ts). Records every outcome as a
 * call_events row, but only treats non-"completed" outcomes as a missed
 * call requiring the lead-creation + follow-up-text workflow — per the
 * confirmed design, the tracked number rings through first, so a completed
 * dial means someone actually answered.
 */
export async function handleMissedCall(
  admin: SupabaseClient,
  params: { from: string; to: string; callSid: string; dialCallStatus: DialCallStatus }
): Promise<{ handled: boolean; reason?: string; smsSent?: boolean; smsSkippedReason?: string }> {
  const { data: organization, error: orgError } = await admin
    .from("organizations")
    .select("id, name, phone_number")
    .eq("phone_number", params.to)
    .maybeSingle();

  if (orgError) throw new Error(orgError.message);
  if (!organization) {
    return { handled: false, reason: `No organization found for number ${params.to}` };
  }

  if (params.dialCallStatus === "completed") {
    await admin.from("call_events").insert({
      organization_id: organization.id,
      twilio_call_sid: params.callSid,
      status: "completed",
    });
    return { handled: true };
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
      source: "missed_call",
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

  await admin.from("call_events").insert({
    organization_id: organization.id,
    lead_id: lead.id,
    twilio_call_sid: params.callSid,
    status: params.dialCallStatus,
  });

  if (lead.status === "new") {
    await admin.from("leads").update({ status: "contacted" }).eq("id", lead.id);
  }

  const compliance = canSendToLead({ optOutStatus: lead.opt_out_status, status: lead.status });
  if (!compliance.allowed) {
    return { handled: true, smsSent: false, smsSkippedReason: compliance.reason };
  }
  if (!TWILIO_ENABLED) {
    return { handled: true, smsSent: false, smsSkippedReason: "Twilio isn't configured yet." };
  }

  // organization.phone_number is guaranteed non-null here: we only reached
  // this organization by matching WHERE phone_number = params.to, which came
  // from a real Twilio request.
  await sendSms(
    params.from,
    organization.phone_number!,
    `Hi, sorry we missed your call! This is ${organization.name} — reply here anytime and we'll get right back to you.`
  );

  return { handled: true, smsSent: true };
}
