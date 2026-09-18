import { verifySession } from "@/lib/dal";
import { prisma } from "@/lib/prisma";
import { IntegrationToggle } from "@/components/IntegrationToggle";
import { IntegrationPhoneField } from "@/components/IntegrationPhoneField";
import { AI_ENABLED } from "@/lib/ai";
import { SMS_ENABLED } from "@/lib/sms";

const PROVIDERS = [
  {
    key: "CRM",
    title: "CRM",
    description: "Sync leads from your existing CRM into LeadPilot's lead database.",
    envReady: null as boolean | null,
  },
  {
    key: "SMS",
    title: "SMS",
    description: "Send and receive real text messages with leads via Twilio.",
    envReady: SMS_ENABLED,
  },
  {
    key: "AI_VOICE",
    title: "AI",
    description: "Let Claude draft chat/SMS replies and summarize phone calls.",
    envReady: AI_ENABLED,
  },
  {
    key: "CALENDAR",
    title: "Calendar",
    description: "Push booked estimates directly onto your team's calendar.",
    envReady: null as boolean | null,
  },
] as const;

export default async function IntegrationsPage() {
  const session = await verifySession();

  const integrations = await prisma.integration.findMany({
    where: { userId: session.userId },
  });
  const byProvider = new Map(integrations.map((i) => [i.provider, i]));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Integrations</h1>
        <p className="mt-1 text-sm text-slate-600">
          Connect the channels that feed your lead database. CRM and Calendar are still
          simulated in this build; SMS and AI go live once you add API keys to{" "}
          <code className="rounded bg-slate-100 px-1 py-0.5">.env</code>.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {PROVIDERS.map((provider) => {
          const record = byProvider.get(provider.key);
          const connected = record?.connected ?? false;
          return (
            <div
              key={provider.key}
              className="flex flex-col justify-between rounded-xl border border-slate-200 bg-white p-6"
            >
              <div>
                <div className="flex items-center justify-between">
                  <h2 className="text-base font-semibold">{provider.title}</h2>
                  <span
                    className={`h-2 w-2 rounded-full ${connected ? "bg-emerald-500" : "bg-slate-300"}`}
                  />
                </div>
                <p className="mt-2 text-sm text-slate-600">{provider.description}</p>
                {provider.envReady !== null && (
                  <p
                    className={`mt-2 text-xs font-medium ${
                      provider.envReady ? "text-emerald-600" : "text-amber-600"
                    }`}
                  >
                    {provider.envReady
                      ? "API keys detected — this will send for real."
                      : "No API keys yet — this will just save locally, nothing is sent."}
                  </p>
                )}
              </div>
              <div className="mt-4">
                <IntegrationToggle provider={provider.key} connected={connected} />
                {provider.key === "SMS" && connected && (
                  <>
                    <p className="mt-3 text-xs text-slate-500">
                      Your Twilio number (for inbound routing):
                    </p>
                    <IntegrationPhoneField
                      provider="SMS"
                      initialValue={record?.phoneNumber ?? ""}
                    />
                  </>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
