import { FORWARD_PIPELINE, LEAD_STATUS_LABELS, type LeadStatus } from "@/lib/lead-status";

export type FunnelStage = {
  status: LeadStatus;
  label: string;
  count: number;
  percentOfTotal: number;
};

/**
 * A lead's *current* status alone can't tell you whether it ever reached
 * "qualified" before falling to "lost" — that history lives in
 * lead_status_history. This walks each lead's history to find the furthest
 * point it ever reached along the forward pipeline, so a lead that was
 * qualified and later lost still counts toward "qualified" here. Leads with
 * no history yet (still "new") count toward "new" only.
 */
export function computeFunnel(
  leads: { id: string }[],
  statusHistory: { leadId: string; toStatus: string }[]
): FunnelStage[] {
  const total = leads.length;

  const furthestIndexByLead = new Map<string, number>();
  for (const lead of leads) {
    furthestIndexByLead.set(lead.id, 0);
  }
  for (const entry of statusHistory) {
    const stageIndex = FORWARD_PIPELINE.indexOf(entry.toStatus as LeadStatus);
    if (stageIndex === -1) continue;
    const current = furthestIndexByLead.get(entry.leadId);
    if (current === undefined || stageIndex > current) {
      furthestIndexByLead.set(entry.leadId, stageIndex);
    }
  }

  return FORWARD_PIPELINE.map((status, stageIndex) => {
    const count = [...furthestIndexByLead.values()].filter((furthest) => furthest >= stageIndex).length;
    return {
      status,
      label: LEAD_STATUS_LABELS[status],
      count,
      percentOfTotal: total === 0 ? 0 : (count / total) * 100,
    };
  });
}

export type SourceBreakdownEntry = {
  source: string;
  count: number;
  percentOfTotal: number;
};

export function computeSourceBreakdown(leads: { source: string | null }[]): SourceBreakdownEntry[] {
  const total = leads.length;
  const counts = new Map<string, number>();

  for (const lead of leads) {
    const key = lead.source?.trim() || "unknown";
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }

  return [...counts.entries()]
    .map(([source, count]) => ({ source, count, percentOfTotal: total === 0 ? 0 : (count / total) * 100 }))
    .sort((a, b) => b.count - a.count);
}

/**
 * Average minutes between a lead being created and the first outbound
 * message going out to it — the "how fast do we actually answer a missed
 * call" number. Leads with no outbound message yet are excluded rather than
 * penalized with an inflated wait time, since they simply haven't been
 * reached yet (that's visible separately via the funnel's "new" count).
 */
export function computeAvgFirstResponseMinutes(
  pairs: { leadCreatedAt: string; firstOutboundAt: string | null }[]
): number | null {
  const responseTimesMs: number[] = [];

  for (const pair of pairs) {
    if (!pair.firstOutboundAt) continue;
    const createdMs = new Date(pair.leadCreatedAt).getTime();
    const respondedMs = new Date(pair.firstOutboundAt).getTime();
    const deltaMs = respondedMs - createdMs;
    if (Number.isFinite(deltaMs) && deltaMs >= 0) {
      responseTimesMs.push(deltaMs);
    }
  }

  if (responseTimesMs.length === 0) return null;

  const avgMs = responseTimesMs.reduce((sum, ms) => sum + ms, 0) / responseTimesMs.length;
  return avgMs / 60_000;
}
