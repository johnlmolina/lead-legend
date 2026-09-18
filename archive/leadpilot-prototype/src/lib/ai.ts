import "server-only";
import Anthropic from "@anthropic-ai/sdk";

const apiKey = process.env.ANTHROPIC_API_KEY;
const client = apiKey ? new Anthropic({ apiKey }) : null;

export const AI_ENABLED = Boolean(client);

const SYSTEM_PROMPT =
  "You are texting on behalf of a home services contractor, replying to a potential " +
  "customer. Keep replies to 1-3 short, friendly sentences, sound like a real person " +
  "(not a bot), and gently move the conversation toward booking a free on-site estimate. " +
  "Never say you are an AI or a bot.";

export type ConversationTurn = { role: "user" | "assistant"; content: string };

export async function draftReply(history: ConversationTurn[]): Promise<string> {
  if (!client) {
    throw new Error("ANTHROPIC_API_KEY is not configured");
  }

  const response = await client.messages.create({
    model: process.env.CLAUDE_MODEL || "claude-sonnet-5",
    max_tokens: 300,
    system: SYSTEM_PROMPT,
    messages: history,
  });

  const textBlock = response.content.find((block) => block.type === "text");
  return textBlock && textBlock.type === "text" ? textBlock.text.trim() : "";
}
