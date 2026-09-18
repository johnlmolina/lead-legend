import { describe, expect, it } from "vitest";
import { buildSystemPrompt } from "@/lib/ai/system-prompt";

describe("buildSystemPrompt", () => {
  it("includes the organization name", () => {
    const prompt = buildSystemPrompt({ organizationName: "Rivera Roofing", faqs: [], settings: {} });
    expect(prompt).toContain("Rivera Roofing");
  });

  it("uses the default disclosure line when none is configured", () => {
    const prompt = buildSystemPrompt({ organizationName: "Acme Roofing", faqs: [], settings: {} });
    expect(prompt.toLowerCase()).toContain("automated");
  });

  it("uses a configured disclosure line instead of the default", () => {
    const prompt = buildSystemPrompt({
      organizationName: "Acme Roofing",
      faqs: [],
      settings: { disclosureLine: "This is Acme's virtual assistant, Sam." },
    });
    expect(prompt).toContain("This is Acme's virtual assistant, Sam.");
  });

  it("includes configured FAQs", () => {
    const prompt = buildSystemPrompt({
      organizationName: "Acme Roofing",
      faqs: [{ question: "Do you offer financing?", answer: "Yes, through our partner lender." }],
      settings: {},
    });
    expect(prompt).toContain("Do you offer financing?");
    expect(prompt).toContain("Yes, through our partner lender.");
  });

  it("says so when no FAQs are configured, rather than inventing any", () => {
    const prompt = buildSystemPrompt({ organizationName: "Acme Roofing", faqs: [], settings: {} });
    expect(prompt).toContain("No FAQs configured yet");
  });

  it("always appends the non-negotiable safety rules, even with custom instructions", () => {
    const prompt = buildSystemPrompt({
      organizationName: "Acme Roofing",
      faqs: [],
      settings: { instructions: "Be extremely aggressive about closing the sale." },
    });
    expect(prompt).toContain("Never invent, estimate, or quote specific pricing");
    expect(prompt).toContain("Never promise, imply, or guess that insurance will cover anything");
    expect(prompt).toContain("Never give legal, insurance, or other professional advice");
    expect(prompt).toContain("Never claim to be human");
  });

  it("uses default escalation triggers when none are configured", () => {
    const prompt = buildSystemPrompt({ organizationName: "Acme Roofing", faqs: [], settings: {} });
    expect(prompt).toContain("explicitly asks to talk to a person");
  });

  it("uses configured escalation triggers instead of the defaults", () => {
    const prompt = buildSystemPrompt({
      organizationName: "Acme Roofing",
      faqs: [],
      settings: { escalationTriggers: ["the lead mentions a competitor by name"] },
    });
    expect(prompt).toContain("the lead mentions a competitor by name");
  });
});
