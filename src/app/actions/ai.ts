"use server";

import { requireOrganization } from "@/lib/dal";
import { draftReply, AI_ENABLED, type ConversationTurn } from "@/lib/ai/draft-reply";
import { buildSystemPrompt } from "@/lib/ai/system-prompt";

export type GenerateDraftResult =
  | { status: "ok"; replyText: string; intent: string; qualified: boolean; wantsHuman: boolean }
  | { status: "blocked"; reasons: string[] }
  | { status: "error"; message: string };

export async function generateAiDraft(leadId: string): Promise<GenerateDraftResult> {
  if (!AI_ENABLED) {
    return { status: "error", message: "ANTHROPIC_API_KEY isn't configured yet." };
  }

  const { supabase, membership } = await requireOrganization();

  const [{ data: lead }, { data: org }, { data: faqs }, { data: aiSettings }] = await Promise.all([
    supabase
      .from("leads")
      .select("id, name")
      .eq("id", leadId)
      .eq("organization_id", membership.organization_id)
      .maybeSingle(),
    supabase.from("organizations").select("name").eq("id", membership.organization_id).single(),
    supabase.from("faqs").select("question, answer").eq("organization_id", membership.organization_id),
    supabase
      .from("ai_settings")
      .select("disclosure_line, persona, escalation_triggers")
      .eq("organization_id", membership.organization_id)
      .maybeSingle(),
  ]);

  if (!lead) {
    return { status: "error", message: "Lead not found." };
  }

  const { data: conversation } = await supabase
    .from("conversations")
    .select("id")
    .eq("lead_id", leadId)
    .eq("channel", "sms")
    .maybeSingle();

  let history: ConversationTurn[] = [];
  if (conversation) {
    const { data: messages } = await supabase
      .from("messages")
      .select("direction, body")
      .eq("conversation_id", conversation.id)
      .order("created_at", { ascending: true });
    history = (messages ?? []).map((m) => ({
      role: m.direction === "inbound" ? "user" : "assistant",
      content: m.body,
    }));
  }

  if (history.length === 0) {
    history = [
      {
        role: "user",
        content: `[No messages yet. The lead's name is ${lead.name ?? "unknown"}. Draft a friendly opening message.]`,
      },
    ];
  } else if (history[history.length - 1].role === "assistant") {
    history = [
      ...history,
      { role: "user", content: "[No reply yet from the lead — draft a brief, friendly follow-up.]" },
    ];
  }

  const persona = (aiSettings?.persona ?? {}) as { instructions?: string | null };
  const systemPrompt = buildSystemPrompt({
    organizationName: org?.name ?? "the company",
    faqs: faqs ?? [],
    settings: {
      disclosureLine: aiSettings?.disclosure_line,
      instructions: persona.instructions,
      escalationTriggers: aiSettings?.escalation_triggers,
    },
  });

  try {
    const result = await draftReply(systemPrompt, history);
    if (result.status === "blocked") {
      return { status: "blocked", reasons: result.reasons };
    }
    return {
      status: "ok",
      replyText: result.assessment.replyText,
      intent: result.assessment.intent,
      qualified: result.assessment.qualified,
      wantsHuman: result.assessment.wantsHuman,
    };
  } catch (err) {
    return { status: "error", message: err instanceof Error ? err.message : "Failed to generate a draft." };
  }
}
