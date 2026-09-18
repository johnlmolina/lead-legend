"use server";

import { revalidatePath } from "next/cache";
import { requireOrganization } from "@/lib/dal";

export async function addFaq(question: string, answer: string) {
  if (!question.trim() || !answer.trim()) {
    throw new Error("Both a question and an answer are required.");
  }
  const { supabase, membership } = await requireOrganization();

  const { error } = await supabase.from("faqs").insert({
    organization_id: membership.organization_id,
    question: question.trim(),
    answer: answer.trim(),
  });
  if (error) throw new Error(error.message);

  revalidatePath("/dashboard/settings");
}

export async function deleteFaq(faqId: string) {
  const { supabase, membership } = await requireOrganization();

  const { error } = await supabase
    .from("faqs")
    .delete()
    .eq("id", faqId)
    .eq("organization_id", membership.organization_id);
  if (error) throw new Error(error.message);

  revalidatePath("/dashboard/settings");
}

export async function updatePhoneSettings(params: {
  phoneNumber: string;
  forwardingPhoneNumber: string;
}) {
  const { supabase, membership } = await requireOrganization();

  const { error } = await supabase
    .from("organizations")
    .update({
      phone_number: params.phoneNumber.trim() || null,
      forwarding_phone_number: params.forwardingPhoneNumber.trim() || null,
    })
    .eq("id", membership.organization_id);
  if (error) throw new Error(error.message);

  revalidatePath("/dashboard/settings");
}

export async function updateAiSettings(params: {
  disclosureLine: string;
  instructions: string;
  escalationTriggers: string;
}) {
  const { supabase, membership } = await requireOrganization();

  const triggers = params.escalationTriggers
    .split("\n")
    .map((t) => t.trim())
    .filter(Boolean);

  const { error } = await supabase.from("ai_settings").upsert({
    organization_id: membership.organization_id,
    disclosure_line: params.disclosureLine.trim() || null,
    persona: { instructions: params.instructions.trim() || null },
    escalation_triggers: triggers,
  });
  if (error) throw new Error(error.message);

  revalidatePath("/dashboard/settings");
}
