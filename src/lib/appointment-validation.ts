export type AppointmentTimeCheck = { valid: true; start: Date; end: Date } | { valid: false; error: string };

/**
 * Pure validation for a proposed appointment time — kept separate from the
 * server action so it's testable without a live Google Calendar connection
 * (which the actual conflict check needs, and can't be faked without a real
 * OAuth flow — see PROGRESS.md's Phase 7 entry).
 */
export function validateAppointmentTime(
  scheduledAtIso: string,
  durationMinutes: number,
  now: Date = new Date()
): AppointmentTimeCheck {
  const start = new Date(scheduledAtIso);
  if (Number.isNaN(start.getTime())) {
    return { valid: false, error: "Invalid date/time." };
  }
  if (start.getTime() < now.getTime()) {
    return { valid: false, error: "Pick a time in the future." };
  }
  if (durationMinutes <= 0) {
    return { valid: false, error: "Duration must be positive." };
  }

  const end = new Date(start.getTime() + durationMinutes * 60_000);
  return { valid: true, start, end };
}
