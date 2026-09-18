import Link from "next/link";
import { requireOrganization } from "@/lib/dal";
import { LeadStatusBadge } from "@/components/LeadStatusBadge";
import { LEAD_STATUS_LABELS, type LeadStatus } from "@/lib/lead-status";
import { ArrowRightIcon } from "@/components/icons";

export default async function DashboardPage() {
  const { supabase, membership } = await requireOrganization();
  const organization = Array.isArray(membership.organizations)
    ? membership.organizations[0]
    : membership.organizations;

  const [{ data: leads, error: leadsError }, { data: recentLeads, error: recentError }, { data: history, error: historyError }] =
    await Promise.all([
      supabase.from("leads").select("status").eq("organization_id", membership.organization_id),
      supabase
        .from("leads")
        .select("id, name, phone, status, created_at")
        .eq("organization_id", membership.organization_id)
        .order("created_at", { ascending: false })
        .limit(5),
      supabase
        .from("lead_status_history")
        .select("id, lead_id, from_status, to_status, changed_at, leads(name, phone)")
        .eq("organization_id", membership.organization_id)
        .order("changed_at", { ascending: false })
        .limit(5),
    ]);

  if (leadsError) throw new Error(`Failed to load leads: ${leadsError.message}`);
  if (recentError) throw new Error(`Failed to load recent leads: ${recentError.message}`);
  if (historyError) throw new Error(`Failed to load activity: ${historyError.message}`);

  const totalLeads = leads?.length ?? 0;
  const wonCount = leads?.filter((l) => l.status === "won").length ?? 0;
  const activeCount =
    leads?.filter((l) => l.status !== "won" && l.status !== "lost" && l.status !== "do_not_contact")
      .length ?? 0;

  return (
    <div className="space-y-8">
      <div>
        <p className="section-eyebrow">Overview</p>
        <h1 className="mt-1.5 font-display text-3xl font-medium tracking-tight text-ink">
          Welcome to {organization?.name ?? "your organization"}
        </h1>
        <p className="mt-1.5 text-sm text-zinc-500">
          You&apos;re signed in as a <span className="font-medium capitalize text-zinc-700">{membership.role}</span>.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label="Total leads" value={totalLeads} />
        <StatCard label="In progress" value={activeCount} accent />
        <StatCard label="Won" value={wonCount} />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="card-pad">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-zinc-900">Recent leads</h2>
            <Link
              href="/dashboard/leads"
              className="inline-flex items-center gap-1 text-sm font-medium text-zinc-500 transition-colors hover:text-accent-700"
            >
              View all
              <ArrowRightIcon className="h-3.5 w-3.5" />
            </Link>
          </div>
          <ul className="mt-4 divide-y divide-zinc-100">
            {recentLeads?.map((lead) => (
              <li key={lead.id}>
                <Link
                  href={`/dashboard/leads/${lead.id}`}
                  className="-mx-2 flex items-center justify-between gap-2 rounded-lg px-2 py-3 transition-colors hover:bg-zinc-50"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-zinc-900">{lead.name || lead.phone}</p>
                    <p className="text-xs text-zinc-500">{lead.phone}</p>
                  </div>
                  <LeadStatusBadge status={lead.status} />
                </Link>
              </li>
            ))}
            {(!recentLeads || recentLeads.length === 0) && (
              <li className="py-3 text-sm text-zinc-500">
                No leads yet.{" "}
                <Link href="/dashboard/leads/new" className="link-quiet">
                  Add one
                </Link>
                .
              </li>
            )}
          </ul>
        </div>

        <div className="card-pad">
          <h2 className="text-sm font-semibold text-zinc-900">Recent activity</h2>
          <ul className="mt-4 divide-y divide-zinc-100">
            {history?.map((entry) => {
              const lead = Array.isArray(entry.leads) ? entry.leads[0] : entry.leads;
              const toLabel = LEAD_STATUS_LABELS[entry.to_status as LeadStatus] ?? entry.to_status;
              const fromLabel = entry.from_status
                ? LEAD_STATUS_LABELS[entry.from_status as LeadStatus] ?? entry.from_status
                : null;
              return (
                <li key={entry.id} className="py-3 text-sm">
                  <Link href={`/dashboard/leads/${entry.lead_id}`} className="hover:underline">
                    <span className="font-medium text-zinc-900">
                      {lead?.name || lead?.phone || "A lead"}
                    </span>{" "}
                    <span className="text-zinc-500">
                      {fromLabel ? `moved from ${fromLabel} to ${toLabel}` : `created as ${toLabel}`}
                    </span>
                  </Link>
                  <p className="mt-0.5 text-xs text-zinc-400">
                    {new Date(entry.changed_at).toLocaleString()}
                  </p>
                </li>
              );
            })}
            {(!history || history.length === 0) && (
              <li className="py-3 text-sm text-zinc-500">Nothing yet.</li>
            )}
          </ul>
        </div>
      </div>
    </div>
  );
}

function StatCard({ label, value, accent = false }: { label: string; value: number; accent?: boolean }) {
  return (
    <div className="card-pad">
      <p className="text-sm text-zinc-500">{label}</p>
      <p className={`mt-2 font-display text-4xl font-medium tracking-tight ${accent ? "text-accent-600" : "text-ink"}`}>
        {value}
      </p>
    </div>
  );
}
