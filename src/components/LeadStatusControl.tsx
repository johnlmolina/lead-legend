"use client";

import { useState, useTransition } from "react";
import { updateLeadStatus } from "@/app/actions/leads";
import { LEAD_STATUS_LABELS, getAllowedNextStatuses, type LeadStatus } from "@/lib/lead-status";

export function LeadStatusControl({
  leadId,
  status,
}: {
  leadId: string;
  status: LeadStatus;
}) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const nextOptions = getAllowedNextStatuses(status);

  if (nextOptions.length === 0) {
    return <p className="text-sm text-zinc-400">No further status changes available.</p>;
  }

  return (
    <div>
      <select
        key={status}
        defaultValue={status}
        disabled={isPending}
        onChange={(e) => {
          const newStatus = e.target.value;
          setError(null);
          startTransition(async () => {
            try {
              await updateLeadStatus(leadId, newStatus);
            } catch (err) {
              setError(err instanceof Error ? err.message : "Failed to update status.");
            }
          });
        }}
        className="input w-auto py-2 pr-8"
      >
        <option value={status}>{LEAD_STATUS_LABELS[status]}</option>
        {nextOptions.map((option) => (
          <option key={option} value={option}>
            Move to: {LEAD_STATUS_LABELS[option]}
          </option>
        ))}
      </select>
      {error && <p className="mt-1 text-sm text-red-600">{error}</p>}
    </div>
  );
}
