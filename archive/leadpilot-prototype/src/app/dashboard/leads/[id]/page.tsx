import { notFound } from "next/navigation";
import { verifySession } from "@/lib/dal";
import { prisma } from "@/lib/prisma";
import { LeadStatusBadge, SourceBadge } from "@/components/StatusBadge";
import { StatusSelect, ReplyForm, CallForm, EstimateForm } from "@/components/lead-actions";

type TimelineItem =
  | { kind: "message"; at: Date; direction: string; channel: string; body: string }
  | { kind: "call"; at: Date; direction: string; summary: string; outcome: string; durationSeconds: number }
  | { kind: "appointment"; at: Date; title: string; scheduledAt: Date; status: string };

export default async function LeadDetailPage(props: PageProps<"/dashboard/leads/[id]">) {
  const { id } = await props.params;
  const session = await verifySession();

  const lead = await prisma.lead.findFirst({
    where: { id, userId: session.userId },
    include: { messages: true, calls: true, appointments: true },
  });

  if (!lead) notFound();

  const timeline: TimelineItem[] = [
    ...lead.messages.map((m): TimelineItem => ({
      kind: "message",
      at: m.createdAt,
      direction: m.direction,
      channel: m.channel,
      body: m.body,
    })),
    ...lead.calls.map((c): TimelineItem => ({
      kind: "call",
      at: c.createdAt,
      direction: c.direction,
      summary: c.summary,
      outcome: c.outcome,
      durationSeconds: c.durationSeconds,
    })),
    ...lead.appointments.map((a): TimelineItem => ({
      kind: "appointment",
      at: a.createdAt,
      title: a.title,
      scheduledAt: a.scheduledAt,
      status: a.status,
    })),
  ].sort((a, b) => a.at.getTime() - b.at.getTime());

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-semibold tracking-tight">{lead.name}</h1>
            <SourceBadge source={lead.source} />
          </div>
          <p className="mt-1 text-sm text-slate-600">
            {lead.phone}
            {lead.email ? ` · ${lead.email}` : ""}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <LeadStatusBadge status={lead.status} />
          <StatusSelect key={lead.status} leadId={lead.id} currentStatus={lead.status} />
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          <div className="rounded-xl border border-slate-200 bg-white p-6">
            <h2 className="text-sm font-semibold text-slate-900">Activity timeline</h2>
            <ol className="mt-4 space-y-4">
              {timeline.map((item, idx) => (
                <li key={idx} className="border-l-2 border-slate-200 pl-4">
                  <TimelineEntry item={item} />
                </li>
              ))}
              {timeline.length === 0 && (
                <p className="text-sm text-slate-500">No activity yet.</p>
              )}
            </ol>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-6">
            <h2 className="text-sm font-semibold text-slate-900">Reply to this lead</h2>
            <p className="mt-1 text-xs text-slate-500">
              Sends as {lead.source === "SMS" ? "an SMS" : "an AI chat"} message.
            </p>
            <div className="mt-3">
              <ReplyForm leadId={lead.id} />
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <div className="rounded-xl border border-slate-200 bg-white p-6">
            <h2 className="text-sm font-semibold text-slate-900">Phone</h2>
            <div className="mt-3">
              <CallForm leadId={lead.id} />
            </div>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-6">
            <h2 className="text-sm font-semibold text-slate-900">Calendar</h2>
            <div className="mt-3">
              <EstimateForm leadId={lead.id} defaultTitle={`Estimate — ${lead.name}`} />
            </div>
            {lead.appointments.length > 0 && (
              <ul className="mt-4 space-y-2 text-sm">
                {lead.appointments.map((appt) => (
                  <li key={appt.id} className="rounded-md bg-slate-50 px-3 py-2">
                    <p className="font-medium text-slate-900">{appt.title}</p>
                    <p className="text-xs text-slate-500">
                      {appt.scheduledAt.toLocaleString(undefined, {
                        weekday: "short",
                        month: "short",
                        day: "numeric",
                        hour: "numeric",
                        minute: "2-digit",
                      })}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function TimelineEntry({ item }: { item: TimelineItem }) {
  const time = item.at.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });

  if (item.kind === "message") {
    const isInbound = item.direction === "INBOUND";
    return (
      <div>
        <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
          {item.channel === "SMS" ? "SMS" : "AI chat"} · {isInbound ? "Lead" : "You"} · {time}
        </p>
        <p
          className={`mt-1 inline-block rounded-lg px-3 py-2 text-sm ${
            isInbound ? "bg-slate-100 text-slate-800" : "bg-slate-900 text-white"
          }`}
        >
          {item.body}
        </p>
      </div>
    );
  }

  if (item.kind === "call") {
    return (
      <div>
        <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
          Phone call · {Math.round(item.durationSeconds / 60)} min · {time}
        </p>
        <p className="mt-1 text-sm text-slate-800">{item.summary}</p>
      </div>
    );
  }

  return (
    <div>
      <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
        Calendar · booked {time}
      </p>
      <p className="mt-1 text-sm text-slate-800">
        {item.title} —{" "}
        {item.scheduledAt.toLocaleString(undefined, {
          weekday: "short",
          month: "short",
          day: "numeric",
          hour: "numeric",
          minute: "2-digit",
        })}
      </p>
    </div>
  );
}
