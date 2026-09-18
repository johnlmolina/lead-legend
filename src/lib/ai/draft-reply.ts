import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import { checkGuardrails } from "./guardrails";

const apiKey = process.env.ANTHROPIC_API_KEY;
const client = apiKey ? new Anthropic({ apiKey }) : null;

export const AI_ENABLED = Boolean(client);

export type ConversationTurn = { role: "user" | "assistant"; content: string };

export type LeadAssessment = {
  replyText: string;
  intent: "interested" | "not_interested" | "unclear";
  qualified: boolean;
  wantsHuman: boolean;
};

export type DraftResult =
  | { status: "ok"; assessment: LeadAssessment }
  | { status: "blocked"; reasons: string[] };

const ASSESSMENT_TOOL: Anthropic.Tool = {
  name: "lead_assessment",
  description:
    "Draft the next reply to send to the lead, and assess their interest so the team can decide next steps.",
  input_schema: {
    type: "object",
    properties: {
      reply_text: {
        type: "string",
        description: "The next message to send to the lead. Follow every rule in the system prompt.",
      },
      intent: {
        type: "string",
        enum: ["interested", "not_interested", "unclear"],
        description: "The lead's apparent interest level based on the conversation so far.",
      },
      qualified: {
        type: "boolean",
        description: "True if this lead seems ready to be offered an on-site estimate.",
      },
      wants_human: {
        type: "boolean",
        description: "True if a human should take over this conversation now, per the escalation triggers.",
      },
    },
    required: ["reply_text", "intent", "qualified", "wants_human"],
  },
};

export async function draftReply(
  systemPrompt: string,
  history: ConversationTurn[]
): Promise<DraftResult> {
  if (!client) {
    throw new Error("ANTHROPIC_API_KEY is not configured");
  }

  const response = await client.messages.create({
    model: process.env.CLAUDE_MODEL || "claude-sonnet-5",
    max_tokens: 500,
    system: systemPrompt,
    messages: history,
    tools: [ASSESSMENT_TOOL],
    tool_choice: { type: "tool", name: "lead_assessment" },
  });

  const toolUse = response.content.find((block) => block.type === "tool_use");
  if (!toolUse || toolUse.type !== "tool_use") {
    throw new Error("Claude did not return a structured assessment.");
  }

  const input = toolUse.input as {
    reply_text?: unknown;
    intent?: unknown;
    qualified?: unknown;
    wants_human?: unknown;
  };

  if (typeof input.reply_text !== "string") {
    throw new Error("Claude's response was missing reply_text.");
  }

  const guardrailResult = checkGuardrails(input.reply_text);
  if (guardrailResult.blocked) {
    return { status: "blocked", reasons: guardrailResult.violations.map((v) => v.category) };
  }

  const intent: LeadAssessment["intent"] =
    input.intent === "interested" || input.intent === "not_interested" ? input.intent : "unclear";

  return {
    status: "ok",
    assessment: {
      replyText: input.reply_text,
      intent,
      qualified: Boolean(input.qualified),
      wantsHuman: Boolean(input.wants_human),
    },
  };
}
