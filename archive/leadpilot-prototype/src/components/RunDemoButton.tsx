"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { runDemoLead } from "@/app/actions/leads";

export function RunDemoButton() {
  const [isPending, startTransition] = useTransition();
  const [justRan, setJustRan] = useState(false);
  const router = useRouter();

  return (
    <button
      type="button"
      disabled={isPending}
      onClick={() => {
        startTransition(async () => {
          const leadId = await runDemoLead();
          setJustRan(true);
          router.push(`/dashboard/leads/${leadId}`);
        });
      }}
      className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700 disabled:opacity-60"
    >
      {isPending ? "Simulating pipeline…" : justRan ? "Run another demo lead" : "Simulate a new lead"}
    </button>
  );
}
