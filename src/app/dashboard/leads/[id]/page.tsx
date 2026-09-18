import { notFound } from "next/navigation";
import { requireOrganization } from "@/lib/dal";
import { LeadStatusBadge } from "@/components/LeadStatusBadge";
import { LeadStatusControl } from "@/components/LeadStatusControl";
import { ConversationThread } from "@/components/ConversationThread";
import { SendMessageForm, SimulateInboundForm } from "@/components/MessageForms";
import { isLeadStatus } from "@/lib/lead-status";
import { TWILIO_ENABLED } from "@/lib/twilio/client";
import { BookAppointmentForm } from "@/components/BookAppointmentForm";
import { CalendarIcon } from "@/components/icons";

export default async function LeadDetailPage(props: PageProps<"/dashboard/leads/[id]">) {
  const { id } = await props.params;
  const { supabase, membership } = await requireOrganization();

  const { data: lead, error } = await supabase
    .from("leads")
    .select("id, name, phone, email, address, source, status, created_at")
    .eq("id", id)
    .eq("organization_id", membership.organization_id)
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to load lead: ${error.message}`);
  }
  if (!lead || !isLeadStatus(lead.status)) {
    notFound();
  }

  const { data: conversation, error: conversationError } = await supabase
    .from("conversations")
    .select("id")
    .eq("lead_id", lead.id)
    .eq("channel", "sms")
    .maybeSingle();
  if (conversationError) {
    throw new Error(`Failed to load conversation: ${conversationError.message}`);
  }

  let messages: { id: string; direction: string; sender: string; body: string; created_at: string }[] = [];
  if (conversation) {
    const { data, error: messagesError } = await supabase
      .from("messages")
      .select("id, direction, sender, body, created_at")
      .eq("conversation_id", conversation.id)
      .order("created_at", { ascending: true });
    if (messagesError) {
      throw new Error(`Failed to load messages: ${messagesError.message}`);
    }
    messages = data ?? [];
  }

  const { data: appointments, error: appointmentsError } = await supabase
    .from("appointments")
    .select("id, title, scheduled_at, status")
    .eq("lead_id", lead.id)
    .order("scheduled_at", { ascending: true });
  if (appointmentsError) {
    throw new Error(`Failed to load appointments: ${appointmentsError.message}`);
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="section-eyebrow">Lead</p>
          <h1 className="mt-1.5 font-display text-3xl font-medium tracking-tight text-ink">
            {lead.name || "(no name)"}
          </h1>
          <p className="mt-1.5 text-sm text-zinc-500">
            {lead.phone}
            {lead.email ? ` · ${lead.email}` : ""}
          </p>
          {lead.address && <p className="text-sm text-zinc-400">{lead.address}</p>}
        </div>
        <div className="flex items-center gap-3">
          <LeadStatusBadge status={lead.status} />
          <LeadStatusControl leadId={lead.id} status={lead.status} />
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="card-pad">
          <h2 className="text-sm font-semibold text-zinc-900">Lead details</h2>
          <dl className="mt-4 space-y-2.5 text-sm">
            <Row label="Source" value={lead.source ?? "—"} />
            <Row label="Added" value={new Date(lead.created_at).toLocaleString()} />
          </dl>
        </div>

        <div className="card-pad flex flex-col">
          <h2 className="text-sm font-semibold text-zinc-900">Conversation</h2>
          <p className="mt-1 text-xs text-zinc-500">
            {TWILIO_ENABLED
              ? "Messages you send here go out as real texts. “Simulate” is still just a local testing tool, not a real inbound channel."
              : "Twilio isn't configured yet — messages here are saved but not delivered. “Simulate” stands in for a lead's reply for testing."}
          </p>
          <div className="mt-4 max-h-80 flex-1 overflow-y-auto">
            <ConversationThread messages={messages} />
          </div>
          <div className="mt-4 space-y-2 border-t border-zinc-100 pt-4">
            <SendMessageForm leadId={lead.id} />
            <SimulateInboundForm leadId={lead.id} />
          </div>
        </div>

        <div className="card-pad lg:col-span-2">
          <div className="flex items-center gap-2.5">
            <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-accent-50 text-accent-700">
              <CalendarIcon className="h-4 w-4" />
            </span>
            <h2 className="text-sm font-semibold text-zinc-900">Appointments</h2>
          </div>
          <p className="mt-1.5 text-xs text-zinc-500">
            Booking checks your real Google Calendar for conflicts before confirming.
          </p>
          {appointments && appointments.length > 0 && (
            <ul className="mt-4 space-y-2">
              {appointments.map((appt) => (
                <li
                  key={appt.id}
                  className="flex items-center justify-between rounded-xl border border-zinc-100 bg-zinc-50/60 px-4 py-3 text-sm"
                >
                  <div>
                    <p className="font-medium text-zinc-900">{appt.title}</p>
                    <p className="text-xs text-zinc-500">
                      {new Date(appt.scheduled_at).toLocaleString(undefined, {
                        weekday: "short",
                        month: "short",
                        day: "numeric",
                        hour: "numeric",
                        minute: "2-digit",
                      })}
                    </p>
                  </div>
                  <span className="rounded-full border border-zinc-200 bg-white px-2.5 py-1 text-xs font-medium capitalize text-zinc-600">
                    {appt.status}
                  </span>
                </li>
              ))}
            </ul>
          )}
          <div className="mt-4">
            <BookAppointmentForm leadId={lead.id} defaultTitle={`Estimate — ${lead.name ?? lead.phone}`} />
          </div>
        </div>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4">
      <dt className="capitalize text-zinc-500">{label}</dt>
      <dd className="text-zinc-900">{value}</dd>
    </div>
  );
}
