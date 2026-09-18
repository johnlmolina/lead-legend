import { LEAD_STATUS_LABELS, type LeadStatus } from "@/lib/lead-status";

const DOT_STYLES: Record<LeadStatus, string> = {
  new: "bg-zinc-400",
  contacted: "bg-sky-500",
  engaged: "bg-sky-500",
  qualified: "bg-indigo-500",
  appointment_booked: "bg-accent-500",
  appointment_completed: "bg-accent-500",
  won: "bg-emerald-500",
  lost: "bg-red-500",
  do_not_contact: "bg-zinc-900",
};

export function LeadStatusBadge({ status }: { status: string }) {
  const isKnown = status in DOT_STYLES;
  const dot = isKnown ? DOT_STYLES[status as LeadStatus] : "bg-zinc-400";
  const label = isKnown ? LEAD_STATUS_LABELS[status as LeadStatus] : status;

  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-zinc-200 bg-white px-2.5 py-1 text-xs font-medium text-zinc-700 shadow-sm">
      <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${dot}`} />
      {label}
    </span>
  );
}
