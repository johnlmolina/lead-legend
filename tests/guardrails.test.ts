import { describe, expect, it } from "vitest";
import { checkGuardrails } from "@/lib/ai/guardrails";

describe("guardrails — should block", () => {
  const shouldBlock: { label: string; text: string; category: string }[] = [
    { label: "explicit dollar amount", text: "That roof replacement would run about $8,500.", category: "pricing" },
    { label: "spelled-out dollars", text: "We're looking at roughly 8000 dollars for this job.", category: "pricing" },
    { label: "quote phrasing", text: "The quote is around $6,200 for the full tear-off.", category: "pricing" },
    { label: "cost phrasing without symbol", text: "It costs about 500 dollars per square.", category: "pricing" },
    {
      label: "insurance will cover",
      text: "Good news, your insurance will cover the full replacement cost.",
      category: "insurance_coverage",
    },
    {
      label: "covered by insurance",
      text: "This should be covered by your insurance after the storm damage.",
      category: "insurance_coverage",
    },
    {
      label: "insurance company will",
      text: "Your insurance company will reimburse you for this.",
      category: "insurance_coverage",
    },
    {
      label: "qualifies for insurance",
      text: "That kind of damage usually qualifies for insurance.",
      category: "insurance_coverage",
    },
    {
      label: "you should sue",
      text: "Honestly, you should sue your previous contractor for that work.",
      category: "legal_advice",
    },
    {
      label: "legally entitled",
      text: "You are legally entitled to a full refund in this situation.",
      category: "legal_advice",
    },
    {
      label: "matter of law",
      text: "As a matter of law, they have to fix this for free.",
      category: "legal_advice",
    },
    { label: "your rights are", text: "Your legal rights are pretty clear here.", category: "legal_advice" },
    { label: "claims to be human", text: "Don't worry, I'm a real person, not a bot!", category: "false_human_claim" },
    {
      label: "denies being an AI",
      text: "Just so you know, I'm not an AI, I'm on the team here.",
      category: "false_human_claim",
    },
  ];

  it.each(shouldBlock)("blocks: $label", ({ text, category }) => {
    const result = checkGuardrails(text);
    expect(result.blocked).toBe(true);
    expect(result.violations.some((v) => v.category === category)).toBe(true);
  });
});

describe("guardrails — should not block", () => {
  const shouldAllow: { label: string; text: string }[] = [
    { label: "free estimate language", text: "I can get you a free, no-obligation estimate this week." },
    { label: "no cost language", text: "There's no cost to have someone take a look." },
    { label: "scheduling language", text: "Does Thursday afternoon work for a quick site visit?" },
    { label: "general reassurance", text: "We handle insurance paperwork all the time and can walk you through it." },
    { label: "asking about insurance without promising", text: "Do you know if you've already filed an insurance claim?" },
    { label: "friendly greeting", text: "Hi! Thanks for reaching out about your roof." },
    { label: "identifies the business", text: "This is the scheduling assistant for Rivera Roofing." },
  ];

  it.each(shouldAllow)("allows: $label", ({ text }) => {
    const result = checkGuardrails(text);
    expect(result.blocked).toBe(false);
  });
});
