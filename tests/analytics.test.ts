import { describe, expect, it } from "vitest";
import {
  computeFunnel,
  computeSourceBreakdown,
  computeAvgFirstResponseMinutes,
} from "@/lib/analytics";

describe("computeFunnel", () => {
  it("counts a lead toward every stage up to the furthest it ever reached", () => {
    // lead-1 went all the way to qualified, then got lost — it should still
    // count toward new/contacted/engaged/qualified, just not appointment_booked.
    const leads = [{ id: "lead-1" }, { id: "lead-2" }, { id: "lead-3" }, { id: "lead-4" }];
    const statusHistory = [
      { leadId: "lead-1", toStatus: "contacted" },
      { leadId: "lead-1", toStatus: "engaged" },
      { leadId: "lead-1", toStatus: "qualified" },
      { leadId: "lead-1", toStatus: "lost" },
      { leadId: "lead-2", toStatus: "contacted" },
      { leadId: "lead-3", toStatus: "contacted" },
      { leadId: "lead-3", toStatus: "engaged" },
      { leadId: "lead-3", toStatus: "qualified" },
      { leadId: "lead-3", toStatus: "appointment_booked" },
      { leadId: "lead-3", toStatus: "appointment_completed" },
      { leadId: "lead-3", toStatus: "won" },
      // lead-4 has no history — stays at "new".
    ];

    const funnel = computeFunnel(leads, statusHistory);
    const byStatus = Object.fromEntries(funnel.map((stage) => [stage.status, stage]));

    expect(byStatus.new.count).toBe(4); // every lead starts as new
    expect(byStatus.contacted.count).toBe(3); // lead-1, lead-2, lead-3
    expect(byStatus.engaged.count).toBe(2); // lead-1, lead-3
    expect(byStatus.qualified.count).toBe(2); // lead-1, lead-3
    expect(byStatus.appointment_booked.count).toBe(1); // lead-3 only
    expect(byStatus.won.count).toBe(1); // lead-3 only

    expect(byStatus.new.percentOfTotal).toBe(100);
    expect(byStatus.qualified.percentOfTotal).toBe(50);
  });

  it("ignores non-forward-pipeline statuses like lost and do_not_contact in history", () => {
    const leads = [{ id: "lead-1" }];
    const statusHistory = [{ leadId: "lead-1", toStatus: "do_not_contact" }];

    const funnel = computeFunnel(leads, statusHistory);
    const byStatus = Object.fromEntries(funnel.map((stage) => [stage.status, stage]));

    expect(byStatus.new.count).toBe(1);
    expect(byStatus.contacted.count).toBe(0);
  });

  it("returns all-zero percentages for an empty lead list", () => {
    const funnel = computeFunnel([], []);
    expect(funnel.every((stage) => stage.count === 0 && stage.percentOfTotal === 0)).toBe(true);
  });
});

describe("computeSourceBreakdown", () => {
  it("counts and sorts sources by count, descending", () => {
    const leads = [
      { source: "website" },
      { source: "website" },
      { source: "referral" },
      { source: null },
    ];

    const breakdown = computeSourceBreakdown(leads);

    expect(breakdown[0]).toEqual({ source: "website", count: 2, percentOfTotal: 50 });
    expect(breakdown.find((s) => s.source === "referral")).toEqual({
      source: "referral",
      count: 1,
      percentOfTotal: 25,
    });
    expect(breakdown.find((s) => s.source === "unknown")).toEqual({
      source: "unknown",
      count: 1,
      percentOfTotal: 25,
    });
  });

  it("returns an empty array for no leads", () => {
    expect(computeSourceBreakdown([])).toEqual([]);
  });
});

describe("computeAvgFirstResponseMinutes", () => {
  it("averages minutes between lead creation and first outbound message", () => {
    const pairs = [
      { leadCreatedAt: "2026-01-01T00:00:00Z", firstOutboundAt: "2026-01-01T00:05:00Z" }, // 5 min
      { leadCreatedAt: "2026-01-01T00:00:00Z", firstOutboundAt: "2026-01-01T00:15:00Z" }, // 15 min
    ];

    expect(computeAvgFirstResponseMinutes(pairs)).toBe(10);
  });

  it("excludes leads that haven't received an outbound message yet", () => {
    const pairs = [
      { leadCreatedAt: "2026-01-01T00:00:00Z", firstOutboundAt: "2026-01-01T00:10:00Z" },
      { leadCreatedAt: "2026-01-01T00:00:00Z", firstOutboundAt: null },
    ];

    expect(computeAvgFirstResponseMinutes(pairs)).toBe(10);
  });

  it("returns null when no lead has been responded to yet", () => {
    const pairs = [{ leadCreatedAt: "2026-01-01T00:00:00Z", firstOutboundAt: null }];
    expect(computeAvgFirstResponseMinutes(pairs)).toBeNull();
  });

  it("ignores a pair where the response somehow precedes the lead's creation", () => {
    const pairs = [
      { leadCreatedAt: "2026-01-01T00:10:00Z", firstOutboundAt: "2026-01-01T00:00:00Z" },
    ];
    expect(computeAvgFirstResponseMinutes(pairs)).toBeNull();
  });
});
