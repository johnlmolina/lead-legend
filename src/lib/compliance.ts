/**
 * The single gate every outbound message must pass through, regardless of
 * whether it's AI-drafted, staff-typed, or an automated missed-call
 * follow-up. A lead that has opted out or been marked do-not-contact must
 * never receive another message — enforced here in code, not left to policy
 * or to remembering to check the status field at each call site.
 */

export type ComplianceCheckInput = {
  optOutStatus: string;
  status: string;
};

export type ComplianceResult = { allowed: true } | { allowed: false; reason: string };

export function canSendToLead(lead: ComplianceCheckInput): ComplianceResult {
  if (lead.optOutStatus === "opted_out") {
    return { allowed: false, reason: "This lead has opted out of messages (replied STOP)." };
  }
  if (lead.status === "do_not_contact") {
    return { allowed: false, reason: "This lead is marked Do Not Contact." };
  }
  return { allowed: true };
}
