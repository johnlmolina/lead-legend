export const LEAD_STATUSES = [
  "new",
  "contacted",
  "engaged",
  "qualified",
  "appointment_booked",
  "appointment_completed",
  "won",
  "lost",
  "do_not_contact",
] as const;

export type LeadStatus = (typeof LEAD_STATUSES)[number];

export const LEAD_STATUS_LABELS: Record<LeadStatus, string> = {
  new: "New",
  contacted: "Contacted",
  engaged: "Engaged",
  qualified: "Qualified",
  appointment_booked: "Appointment booked",
  appointment_completed: "Appointment completed",
  won: "Won",
  lost: "Lost",
  do_not_contact: "Do not contact",
};

/**
 * The lead pipeline's state machine. Forward progress is the common case,
 * but `lost` deliberately loops back to `contacted` — reactivating leads
 * that went cold is a core part of this product, not an edge case. Once a
 * lead is `won` or `do_not_contact`, no further transitions are offered:
 * `won` is a terminal success state, and `do_not_contact` is a compliance
 * flag that shouldn't be casually reversible from a status dropdown (a real
 * correction path, if ever needed, should be a deliberate, audited action —
 * not part of this table).
 */
const ALLOWED_TRANSITIONS: Record<LeadStatus, LeadStatus[]> = {
  new: ["contacted", "do_not_contact"],
  contacted: ["engaged", "lost", "do_not_contact"],
  engaged: ["qualified", "lost", "do_not_contact"],
  qualified: ["appointment_booked", "lost", "do_not_contact"],
  appointment_booked: ["appointment_completed", "lost", "do_not_contact"],
  appointment_completed: ["won", "lost", "do_not_contact"],
  won: [],
  lost: ["contacted", "do_not_contact"],
  do_not_contact: [],
};

export function getAllowedNextStatuses(current: LeadStatus): LeadStatus[] {
  return ALLOWED_TRANSITIONS[current];
}

export function canTransition(from: LeadStatus, to: LeadStatus): boolean {
  if (from === to) return true;
  return ALLOWED_TRANSITIONS[from].includes(to);
}

export const FORWARD_PIPELINE: LeadStatus[] = [
  "new",
  "contacted",
  "engaged",
  "qualified",
  "appointment_booked",
  "appointment_completed",
  "won",
];

/**
 * The single-step transition table is deliberately strict, but a lead that
 * already replied with clear interest has, in effect, already been
 * "contacted" and "engaged" — those milestones happened, they just weren't
 * clicked through one at a time. This returns the intermediate steps needed
 * to walk `from` forward to `to` along the pipeline (each one individually
 * valid per canTransition), so a single "mark as qualified" action can catch
 * the status up to what already happened, without weakening the single-step
 * rules themselves. Returns [] if `to` isn't forward-reachable from `from`
 * along the plain pipeline (e.g. `to` is "lost" or behind "from").
 */
export function getForwardSteps(from: LeadStatus, to: LeadStatus): LeadStatus[] {
  const fromIndex = FORWARD_PIPELINE.indexOf(from);
  const toIndex = FORWARD_PIPELINE.indexOf(to);
  if (fromIndex === -1 || toIndex === -1 || toIndex <= fromIndex) return [];
  return FORWARD_PIPELINE.slice(fromIndex + 1, toIndex + 1);
}

export function isLeadStatus(value: string): value is LeadStatus {
  return (LEAD_STATUSES as readonly string[]).includes(value);
}
