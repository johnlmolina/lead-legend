/**
 * A deterministic, non-AI safety net that runs on every AI-drafted message
 * before it can reach a lead. This is a backstop, not a substitute for the
 * system prompt — LLMs are probabilistic, and a safety property that only
 * lives in a prompt is a property that will eventually be violated. See
 * ARCHITECTURE.md §5.
 *
 * Deliberately conservative: false positives (blocking something harmless)
 * just mean a human reviews a message that didn't need it. False negatives
 * (letting something harmful through) are the failure mode that actually
 * matters, so patterns lean toward over-blocking.
 */

export type GuardrailCategory = "pricing" | "insurance_coverage" | "legal_advice" | "false_human_claim";

export type GuardrailViolation = {
  category: GuardrailCategory;
  matched: string;
};

export type GuardrailResult = {
  blocked: boolean;
  violations: GuardrailViolation[];
};

type Pattern = { category: GuardrailCategory; regex: RegExp };

const PATTERNS: Pattern[] = [
  // Pricing — specific currency amounts. "free" / "no cost" / "no
  // obligation" are NOT blocked: they don't quote a price, they're standard
  // marketing language this product's own templates already use.
  { category: "pricing", regex: /\$\s?\d/ },
  { category: "pricing", regex: /\b\d+(\.\d+)?\s*(dollars|usd|bucks)\b/i },
  { category: "pricing", regex: /\b(costs?|priced?|quote(d)?)\s+(is|at|of|around|about)?\s*\$?\d/i },

  // Insurance coverage promises.
  { category: "insurance_coverage", regex: /insurance\s+(will|should|would|can|could)\s+(cover|pay|reimburse)/i },
  { category: "insurance_coverage", regex: /(covered|reimbursed|paid\s+for)\s+by\s+(your\s+)?insurance/i },
  { category: "insurance_coverage", regex: /your\s+insurance\s+(company\s+)?will/i },
  { category: "insurance_coverage", regex: /qualifies?\s+for\s+insurance/i },

  // Legal/professional advice and entitlement claims.
  { category: "legal_advice", regex: /you\s+(should|could|can)\s+sue/i },
  { category: "legal_advice", regex: /legal(ly)?\s+(entitled|obligated|required)/i },
  { category: "legal_advice", regex: /as\s+a\s+matter\s+of\s+law/i },
  { category: "legal_advice", regex: /\bmy\s+legal\s+advice\b/i },
  { category: "legal_advice", regex: /\byour\s+(legal\s+)?rights?\s+(are|include)\b/i },

  // Claiming to be human / denying being an AI — this product's disclosure
  // policy (see ai_settings.disclosure_line) is a decision for the business,
  // but an outright lie about being automated is never acceptable regardless
  // of that setting.
  { category: "false_human_claim", regex: /\bi\s*('m| am)\s+(a\s+)?(real\s+)?(human|person)\b/i },
  { category: "false_human_claim", regex: /\bi\s*('m| am)\s+not\s+(an?\s+)?(ai|bot|robot|automated)\b/i },
];

export function checkGuardrails(text: string): GuardrailResult {
  const violations: GuardrailViolation[] = [];

  for (const { category, regex } of PATTERNS) {
    const match = text.match(regex);
    if (match) {
      violations.push({ category, matched: match[0] });
    }
  }

  return { blocked: violations.length > 0, violations };
}
