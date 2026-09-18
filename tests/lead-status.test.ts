import { describe, expect, it } from "vitest";
import { LEAD_STATUSES, canTransition, getAllowedNextStatuses, getForwardSteps } from "@/lib/lead-status";

describe("lead status transitions", () => {
  it("allows the forward pipeline", () => {
    expect(canTransition("new", "contacted")).toBe(true);
    expect(canTransition("contacted", "engaged")).toBe(true);
    expect(canTransition("engaged", "qualified")).toBe(true);
    expect(canTransition("qualified", "appointment_booked")).toBe(true);
    expect(canTransition("appointment_booked", "appointment_completed")).toBe(true);
    expect(canTransition("appointment_completed", "won")).toBe(true);
  });

  it("allows a no-op transition to the same status", () => {
    for (const status of LEAD_STATUSES) {
      expect(canTransition(status, status)).toBe(true);
    }
  });

  it("does not allow skipping stages forward", () => {
    expect(canTransition("new", "qualified")).toBe(false);
    expect(canTransition("contacted", "won")).toBe(false);
  });

  it("does not allow going directly from lost back to new", () => {
    expect(canTransition("lost", "new")).toBe(false);
  });

  it("allows reactivating a lost lead back to contacted", () => {
    expect(canTransition("lost", "contacted")).toBe(true);
  });

  it("allows moving to do_not_contact from any non-terminal status", () => {
    const nonTerminal = LEAD_STATUSES.filter((s) => s !== "won" && s !== "do_not_contact");
    for (const status of nonTerminal) {
      expect(canTransition(status, "do_not_contact")).toBe(true);
    }
  });

  it("treats won as terminal", () => {
    expect(getAllowedNextStatuses("won")).toEqual([]);
  });

  it("treats do_not_contact as terminal", () => {
    expect(getAllowedNextStatuses("do_not_contact")).toEqual([]);
  });

  it("does not allow reviving a won or do_not_contact lead", () => {
    expect(canTransition("won", "lost")).toBe(false);
    expect(canTransition("do_not_contact", "contacted")).toBe(false);
  });
});

describe("getForwardSteps", () => {
  it("returns every intermediate step needed to reach a later pipeline status", () => {
    expect(getForwardSteps("new", "qualified")).toEqual(["contacted", "engaged", "qualified"]);
  });

  it("returns a single step when already one away", () => {
    expect(getForwardSteps("engaged", "qualified")).toEqual(["qualified"]);
  });

  it("returns an empty path for a no-op", () => {
    expect(getForwardSteps("qualified", "qualified")).toEqual([]);
  });

  it("returns an empty path when the target is behind the current status", () => {
    expect(getForwardSteps("qualified", "new")).toEqual([]);
  });

  it("returns an empty path for a target outside the forward pipeline", () => {
    expect(getForwardSteps("new", "lost")).toEqual([]);
    expect(getForwardSteps("new", "do_not_contact")).toEqual([]);
  });

  it("every returned step is individually a valid transition", () => {
    const steps = getForwardSteps("new", "won");
    let current: (typeof steps)[number] | "new" = "new";
    for (const step of steps) {
      expect(canTransition(current, step)).toBe(true);
      current = step;
    }
  });
});
