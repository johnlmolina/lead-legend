import { describe, expect, it } from "vitest";
import { canSendToLead } from "@/lib/compliance";

describe("canSendToLead", () => {
  it("blocks a lead that has opted out", () => {
    const result = canSendToLead({ optOutStatus: "opted_out", status: "engaged" });
    expect(result.allowed).toBe(false);
  });

  it("blocks a lead marked do_not_contact even if not formally opted out", () => {
    const result = canSendToLead({ optOutStatus: "subscribed", status: "do_not_contact" });
    expect(result.allowed).toBe(false);
  });

  it("blocks when both conditions apply", () => {
    const result = canSendToLead({ optOutStatus: "opted_out", status: "do_not_contact" });
    expect(result.allowed).toBe(false);
  });

  it("allows a normal subscribed lead", () => {
    const result = canSendToLead({ optOutStatus: "subscribed", status: "new" });
    expect(result.allowed).toBe(true);
  });

  it("allows every non-blocked pipeline status as long as subscribed", () => {
    for (const status of ["new", "contacted", "engaged", "qualified", "won", "lost"]) {
      expect(canSendToLead({ optOutStatus: "subscribed", status }).allowed).toBe(true);
    }
  });
});
