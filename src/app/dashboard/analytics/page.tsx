import { requireOrganization } from "@/lib/dal";
import { computeFunnel, computeSourceBreakdown, computeAvgFirstResponseMinutes } from "@/lib/analytics";
import { ChartIcon, PhoneIcon, CalendarIcon } from "@/components/icons";

function formatMinutes(minutes: number): string {
  if (minutes < 60) return `${Math.max(1, Math.round(minutes))} min`;
  const hours = Math.floor(minutes / 60);
  const mins = Math.round(minutes % 60);
  return mins === 0 ? `${hours}h` : `${hours}h ${mins}m`;
}

export default async function AnalyticsPage() {
  const { supabase, membership } = await requireOrganization();

  const [{ data: leads, error: leadsError }, { data: statusHistory, error: historyError }, { data: outboundMessages, error: messagesError }] =
    await Promise.all([
      supabase
        .from("leads")
        .select("id, source, created_at")
        .eq("organization_id", membership.organization_id),
      supabase
        .from("lead_status_history")
        .select("lead_id, to_status")
        .eq("organization_id", membership.organization_id),
      supabase
        .from("messages")
        .select("created_at, conversations!inner(lead_id)")
        .eq("organization_id", membership.organization_id)
        .eq("direction", "outbound")
        .order("created_at", { ascending: true }),
    ]);

  if (leadsError) throw new Error(`Failed to load leads: ${leadsError.message}`);
  if (historyError) throw new Error(`Failed to load status history: ${historyError.message}`);
  if (messagesError) throw new Error(`Failed to load messages: ${messagesError.message}`);

  const allLeads = leads ?? [];

  const funnel = computeFunnel(
    allLeads.map((l) => ({ id: l.id })),
    (statusHistory ?? []).map((h) => ({ leadId: h.lead_id, toStatus: h.to_status }))
  );
  const bookedStage = funnel.find((s) => s.status === "appointment_booked");

  const sourceBreakdown = computeSourceBreakdown(allLeads.map((l) => ({ source: l.source })));

  const firstOutboundByLead = new Map<string, string>();
  for (const message of outboundMessages ?? []) {
    const conversation = Array.isArray(message.conversations) ? message.conversations[0] : message.conversations;
    const leadId = conversation?.lead_id;
    if (leadId && !firstOutboundByLead.has(leadId)) {
      firstOutboundByLead.set(leadId, message.created_at);
    }
  }
  const avgResponseMinutes = computeAvgFirstResponseMinutes(
    allLeads.map((l) => ({ leadCreatedAt: l.created_at, firstOutboundAt: firstOutboundByLead.get(l.id) ?? null }))
  );

  const maxFunnelCount = Math.max(1, ...funnel.map((s) => s.count));
  const maxSourceCount = Math.max(1, ...sourceBreakdown.map((s) => s.count));

  return (
    <div className="space-y-8">
      <div>
        <p className="section-eyebrow">Insights</p>
        <h1 className="mt-1.5 font-display text-3xl font-medium tracking-tight text-ink">Analytics</h1>
        <p className="mt-1.5 text-sm text-zinc-500">
          How leads move through your pipeline, where they come from, and how fast you respond.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <div className="card-pad">
          <div className="flex items-center gap-2 text-sm text-zinc-500">
            <PhoneIcon className="h-4 w-4 text-accent-600" />
            Avg. first response
          </div>
          <p className="mt-2 font-display text-3xl font-medium tracking-tight text-ink">
            {avgResponseMinutes === null ? "—" : formatMinutes(avgResponseMinutes)}
          </p>
          <p className="mt-1 text-xs text-zinc-400">Lead created &rarr; first outbound text</p>
        </div>
        <div className="card-pad">
          <div className="flex items-center gap-2 text-sm text-zinc-500">
            <CalendarIcon className="h-4 w-4 text-accent-600" />
            Booked rate
          </div>
          <p className="mt-2 font-display text-3xl font-medium tracking-tight text-ink">
            {bookedStage ? `${Math.round(bookedStage.percentOfTotal)}%` : "0%"}
          </p>
          <p className="mt-1 text-xs text-zinc-400">Leads that ever reached a booked estimate</p>
        </div>
        <div className="card-pad">
          <div className="flex items-center gap-2 text-sm text-zinc-500">
            <ChartIcon className="h-4 w-4 text-accent-600" />
            Total leads
          </div>
          <p className="mt-2 font-display text-3xl font-medium tracking-tight text-ink">{allLeads.length}</p>
          <p className="mt-1 text-xs text-zinc-400">All time</p>
        </div>
      </div>

      <div className="card-pad">
        <h2 className="text-sm font-semibold text-zinc-900">Conversion funnel</h2>
        <p className="mt-1 text-xs text-zinc-500">
          Counts every lead that ever reached each stage, even if it later moved to lost.
        </p>
        <ul className="mt-5 space-y-3.5">
          {funnel.map((stage) => (
            <li key={stage.status}>
              <div className="flex items-baseline justify-between text-sm">
                <span className="font-medium text-zinc-800">{stage.label}</span>
                <span className="text-zinc-500">
                  {stage.count} &middot; {Math.round(stage.percentOfTotal)}%
                </span>
              </div>
              <div className="mt-1.5 h-2 w-full overflow-hidden rounded-full bg-zinc-100">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-accent-400 to-accent-600"
                  style={{ width: `${(stage.count / maxFunnelCount) * 100}%` }}
                />
              </div>
            </li>
          ))}
        </ul>
        {allLeads.length === 0 && (
          <p className="mt-4 text-sm text-zinc-400">No leads yet — the funnel will fill in as leads come through.</p>
        )}
      </div>

      <div className="card-pad">
        <h2 className="text-sm font-semibold text-zinc-900">Lead sources</h2>
        <p className="mt-1 text-xs text-zinc-500">Where your leads are coming from.</p>
        <ul className="mt-5 space-y-3.5">
          {sourceBreakdown.map((entry) => (
            <li key={entry.source}>
              <div className="flex items-baseline justify-between text-sm">
                <span className="font-medium capitalize text-zinc-800">{entry.source.replace(/_/g, " ")}</span>
                <span className="text-zinc-500">
                  {entry.count} &middot; {Math.round(entry.percentOfTotal)}%
                </span>
              </div>
              <div className="mt-1.5 h-2 w-full overflow-hidden rounded-full bg-zinc-100">
                <div
                  className="h-full rounded-full bg-zinc-800"
                  style={{ width: `${(entry.count / maxSourceCount) * 100}%` }}
                />
              </div>
            </li>
          ))}
          {sourceBreakdown.length === 0 && <p className="text-sm text-zinc-400">No leads yet.</p>}
        </ul>
      </div>
    </div>
  );
}
