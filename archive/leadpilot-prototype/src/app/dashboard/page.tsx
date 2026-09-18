import Link from "next/link";
import { verifySession } from "@/lib/dal";
import { prisma } from "@/lib/prisma";
import { LeadStatusBadge, SourceBadge } from "@/components/StatusBadge";
import { RunDemoButton } from "@/components/RunDemoButton";

const FUNNEL_STAGES = [
  { key: "leads", label: "Leads captured" },
  { key: "contacted", label: "Contacted (AI/SMS/call)" },
  { key: "booked", label: "Estimates booked" },
] as const;

export default async function DashboardOverviewPage() {
  const session = await verifySession();

  const [totalLeads, contactedOrBeyond, booked, recentLeads, upcomingAppointments] =
    await Promise.all([
      prisma.lead.count({ where: { userId: session.userId } }),
      prisma.lead.count({
        where: {
          userId: session.userId,
          status: { in: ["CONTACTED", "CALL_SCHEDULED", "CALL_COMPLETED", "ESTIMATE_BOOKED", "WON"] },
        },
      }),
      prisma.lead.count({
        where: { userId: session.userId, status: { in: ["ESTIMATE_BOOKED", "WON"] } },
      }),
      prisma.lead.findMany({
        where: { userId: session.userId },
        orderBy: { createdAt: "desc" },
        take: 5,
      }),
      prisma.appointment.findMany({
        where: { userId: session.userId, status: "SCHEDULED" },
        orderBy: { scheduledAt: "asc" },
        take: 5,
        include: { lead: true },
      }),
    ]);

  const funnelValues = { leads: totalLeads, contacted: contactedOrBeyond, booked };
  const maxValue = Math.max(totalLeads, 1);

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Overview</h1>
          <p className="mt-1 text-sm text-slate-600">
            Your lead pipeline, from first contact to booked estimate.
          </p>
        </div>
        <RunDemoButton />
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label="Total leads" value={totalLeads} />
        <StatCard label="In progress" value={contactedOrBeyond - booked > 0 ? contactedOrBeyond - booked : 0} />
        <StatCard label="Estimates booked" value={booked} />
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-6">
        <h2 className="text-sm font-semibold text-slate-900">Pipeline funnel</h2>
        <div className="mt-4 space-y-3">
          {FUNNEL_STAGES.map((stage) => {
            const value = funnelValues[stage.key];
            const width = totalLeads === 0 ? 0 : Math.max((value / maxValue) * 100, value > 0 ? 4 : 0);
            return (
              <div key={stage.key}>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-slate-600">{stage.label}</span>
                  <span className="font-medium text-slate-900">{value}</span>
                </div>
                <div className="mt-1 h-2 w-full rounded-full bg-slate-100">
                  <div
                    className="h-2 rounded-full bg-slate-900"
                    style={{ width: `${width}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
        {totalLeads === 0 && (
          <p className="mt-4 text-sm text-slate-500">
            No leads yet — click &ldquo;Simulate a new lead&rdquo; to see the pipeline in action.
          </p>
        )}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-xl border border-slate-200 bg-white p-6">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-slate-900">Recent leads</h2>
            <Link href="/dashboard/leads" className="text-sm font-medium text-slate-600 hover:text-slate-900">
              View all →
            </Link>
          </div>
          <ul className="mt-4 divide-y divide-slate-100">
            {recentLeads.map((lead) => (
              <li key={lead.id} className="py-3">
                <Link
                  href={`/dashboard/leads/${lead.id}`}
                  className="flex items-center justify-between gap-2 hover:opacity-80"
                >
                  <div>
                    <p className="text-sm font-medium text-slate-900">{lead.name}</p>
                    <div className="mt-1 flex items-center gap-2">
                      <SourceBadge source={lead.source} />
                    </div>
                  </div>
                  <LeadStatusBadge status={lead.status} />
                </Link>
              </li>
            ))}
            {recentLeads.length === 0 && (
              <li className="py-3 text-sm text-slate-500">No leads yet.</li>
            )}
          </ul>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-6">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-slate-900">Upcoming estimates</h2>
            <Link href="/dashboard/calendar" className="text-sm font-medium text-slate-600 hover:text-slate-900">
              View calendar →
            </Link>
          </div>
          <ul className="mt-4 divide-y divide-slate-100">
            {upcomingAppointments.map((appt) => (
              <li key={appt.id} className="py-3">
                <Link
                  href={`/dashboard/leads/${appt.leadId}`}
                  className="flex items-center justify-between gap-2 hover:opacity-80"
                >
                  <div>
                    <p className="text-sm font-medium text-slate-900">{appt.title}</p>
                    <p className="mt-1 text-xs text-slate-500">
                      {appt.scheduledAt.toLocaleString(undefined, {
                        weekday: "short",
                        month: "short",
                        day: "numeric",
                        hour: "numeric",
                        minute: "2-digit",
                      })}
                    </p>
                  </div>
                </Link>
              </li>
            ))}
            {upcomingAppointments.length === 0 && (
              <li className="py-3 text-sm text-slate-500">Nothing scheduled yet.</li>
            )}
          </ul>
        </div>
      </div>
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-6">
      <p className="text-sm text-slate-600">{label}</p>
      <p className="mt-2 text-3xl font-semibold tracking-tight">{value}</p>
    </div>
  );
}
