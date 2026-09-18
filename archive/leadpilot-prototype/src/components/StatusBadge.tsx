const LEAD_STATUS_STYLES: Record<string, string> = {
  NEW: "bg-slate-100 text-slate-700",
  CONTACTED: "bg-blue-100 text-blue-700",
  CALL_SCHEDULED: "bg-blue-100 text-blue-700",
  CALL_COMPLETED: "bg-amber-100 text-amber-700",
  ESTIMATE_BOOKED: "bg-emerald-100 text-emerald-700",
  WON: "bg-emerald-100 text-emerald-700",
  LOST: "bg-red-100 text-red-700",
};

const LEAD_STATUS_LABELS: Record<string, string> = {
  NEW: "New",
  CONTACTED: "Contacted",
  CALL_SCHEDULED: "Call scheduled",
  CALL_COMPLETED: "Call completed",
  ESTIMATE_BOOKED: "Estimate booked",
  WON: "Won",
  LOST: "Lost",
};

export function LeadStatusBadge({ status }: { status: string }) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
        LEAD_STATUS_STYLES[status] ?? "bg-slate-100 text-slate-700"
      }`}
    >
      {LEAD_STATUS_LABELS[status] ?? status}
    </span>
  );
}

const SOURCE_LABELS: Record<string, string> = {
  CRM: "CRM",
  AI_CHAT: "AI Chat",
  SMS: "SMS",
  WEBSITE: "Website",
};

export function SourceBadge({ source }: { source: string }) {
  return (
    <span className="inline-flex items-center rounded-full border border-slate-300 px-2.5 py-0.5 text-xs font-medium text-slate-600">
      {SOURCE_LABELS[source] ?? source}
    </span>
  );
}
