import { requireOrganization } from "@/lib/dal";
import { FaqManager } from "@/components/FaqManager";
import { AiSettingsForm } from "@/components/AiSettingsForm";
import { PhoneSettingsForm } from "@/components/PhoneSettingsForm";
import { AI_ENABLED } from "@/lib/ai/draft-reply";
import { TWILIO_ENABLED } from "@/lib/twilio/client";
import { GOOGLE_CALENDAR_ENABLED } from "@/lib/google/oauth";
import { connectGoogleCalendar, disconnectGoogleCalendar } from "@/app/actions/calendar";
import { CalendarIcon, PhoneIcon, MessageIcon, SparkIcon } from "@/components/icons";

export default async function SettingsPage(props: PageProps<"/dashboard/settings">) {
  const { supabase, membership } = await requireOrganization();
  const searchParams = await props.searchParams;
  const calendarStatus = typeof searchParams.calendar === "string" ? searchParams.calendar : undefined;
  const calendarError =
    typeof searchParams.calendar_error === "string" ? searchParams.calendar_error : undefined;

  const [{ data: faqs }, { data: aiSettings }, { data: organization }, { data: calendarConnection }] =
    await Promise.all([
      supabase
        .from("faqs")
        .select("id, question, answer")
        .eq("organization_id", membership.organization_id)
        .order("created_at", { ascending: true }),
      supabase
        .from("ai_settings")
        .select("disclosure_line, persona, escalation_triggers")
        .eq("organization_id", membership.organization_id)
        .maybeSingle(),
      supabase
        .from("organizations")
        .select("phone_number, forwarding_phone_number")
        .eq("id", membership.organization_id)
        .single(),
      supabase
        .from("calendar_connections")
        .select("connected_at, calendar_id")
        .eq("organization_id", membership.organization_id)
        .maybeSingle(),
    ]);

  const persona = (aiSettings?.persona ?? {}) as { instructions?: string | null };
  const publicAppUrl = process.env.PUBLIC_APP_URL;

  return (
    <div className="max-w-2xl space-y-8">
      <div>
        <p className="section-eyebrow">Configuration</p>
        <h1 className="mt-1.5 font-display text-3xl font-medium tracking-tight text-ink">Settings</h1>
        <p className="mt-1.5 text-sm text-zinc-500">
          Configure your phone number, calendar, and what the AI assistant knows and how it
          behaves.
        </p>
      </div>

      <section className="card-pad">
        <SectionHeading icon={CalendarIcon} title="Calendar" />
        {!GOOGLE_CALENDAR_ENABLED && (
          <p className="mt-2 text-sm text-amber-700">
            Google Calendar isn&apos;t configured yet — see README.md.
          </p>
        )}
        {calendarStatus === "connected" && (
          <p className="mt-3 rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
            Calendar connected.
          </p>
        )}
        {calendarStatus === "error" && (
          <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
            Couldn&apos;t connect: {calendarError ?? "unknown error"}
          </p>
        )}
        <div className="mt-4">
          {calendarConnection ? (
            <div className="flex items-center gap-3">
              <span className="inline-flex items-center gap-1.5 text-sm text-zinc-700">
                <span className="h-2 w-2 rounded-full bg-emerald-500" />
                Connected since{" "}
                {new Date(calendarConnection.connected_at as unknown as string).toLocaleDateString()}
              </span>
              <form action={disconnectGoogleCalendar}>
                <button type="submit" className="btn-secondary btn-sm">
                  Disconnect
                </button>
              </form>
            </div>
          ) : (
            <form action={connectGoogleCalendar}>
              <button type="submit" disabled={!GOOGLE_CALENDAR_ENABLED} className="btn-primary">
                Connect Google Calendar
              </button>
            </form>
          )}
        </div>
      </section>

      <section className="card-pad">
        <SectionHeading icon={PhoneIcon} title="Phone & SMS" />
        {!TWILIO_ENABLED && (
          <p className="mt-2 text-sm text-amber-700">
            Twilio isn&apos;t configured yet — see README.md. These settings still save, but
            nothing will send or receive for real until it is.
          </p>
        )}
        <div className="mt-4">
          <PhoneSettingsForm
            initialPhoneNumber={organization?.phone_number ?? ""}
            initialForwardingPhoneNumber={organization?.forwarding_phone_number ?? ""}
          />
        </div>
        {TWILIO_ENABLED && (
          <div className="mt-4 rounded-lg bg-zinc-50 p-3.5 text-xs text-zinc-600">
            <p className="font-medium text-zinc-700">
              In your Twilio number&apos;s settings, point these webhooks at:
            </p>
            <p className="mt-1.5">
              A message comes in:{" "}
              <code className="rounded bg-white px-1.5 py-0.5 text-zinc-800">
                {publicAppUrl ? `${publicAppUrl}/api/webhooks/twilio/sms` : "<your-public-url>/api/webhooks/twilio/sms"}
              </code>
            </p>
            <p className="mt-1">
              A call comes in:{" "}
              <code className="rounded bg-white px-1.5 py-0.5 text-zinc-800">
                {publicAppUrl ? `${publicAppUrl}/api/webhooks/twilio/voice` : "<your-public-url>/api/webhooks/twilio/voice"}
              </code>
            </p>
            {!publicAppUrl && (
              <p className="mt-2 text-amber-700">
                PUBLIC_APP_URL isn&apos;t set — needed for local testing via a tunnel (e.g.
                ngrok). See README.md.
              </p>
            )}
          </div>
        )}
      </section>

      <section className="card-pad">
        <SectionHeading icon={MessageIcon} title="Approved FAQs" />
        <p className="mt-1.5 text-xs text-zinc-500">
          The AI only answers questions using these — it won&apos;t improvise business details.
        </p>
        <div className="mt-4">
          <FaqManager initialFaqs={faqs ?? []} />
        </div>
      </section>

      <section className="card-pad">
        <SectionHeading icon={SparkIcon} title="AI behavior" />
        {!AI_ENABLED && (
          <p className="mt-2 text-sm text-amber-700">
            ANTHROPIC_API_KEY isn&apos;t configured yet — these settings are saved but
            &ldquo;Suggest with AI&rdquo; won&apos;t work until it is.
          </p>
        )}
        <div className="mt-4">
          <AiSettingsForm
            initialDisclosureLine={aiSettings?.disclosure_line ?? ""}
            initialInstructions={persona.instructions ?? ""}
            initialEscalationTriggers={(aiSettings?.escalation_triggers ?? []).join("\n")}
          />
        </div>
      </section>
    </div>
  );
}

function SectionHeading({ icon: Icon, title }: { icon: (props: { className?: string }) => React.ReactElement; title: string }) {
  return (
    <div className="flex items-center gap-2.5">
      <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-accent-50 text-accent-700">
        <Icon className="h-4 w-4" />
      </span>
      <h2 className="text-sm font-semibold text-zinc-900">{title}</h2>
    </div>
  );
}
