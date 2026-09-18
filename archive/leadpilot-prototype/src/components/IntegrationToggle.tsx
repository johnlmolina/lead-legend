"use client";

import { useTransition } from "react";
import { toggleIntegration } from "@/app/actions/integrations";

export function IntegrationToggle({
  provider,
  connected,
}: {
  provider: string;
  connected: boolean;
}) {
  const [isPending, startTransition] = useTransition();

  return (
    <button
      type="button"
      disabled={isPending}
      onClick={() => startTransition(() => toggleIntegration(provider, !connected))}
      className={`rounded-md px-4 py-2 text-sm font-medium disabled:opacity-60 ${
        connected
          ? "border border-slate-300 text-slate-700 hover:bg-slate-50"
          : "bg-slate-900 text-white hover:bg-slate-700"
      }`}
    >
      {connected ? "Disconnect" : "Connect"}
    </button>
  );
}
