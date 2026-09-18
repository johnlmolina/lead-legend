import "server-only";

const CALENDAR_API_BASE = "https://www.googleapis.com/calendar/v3";

type FreeBusyResponse = {
  calendars?: Record<string, { busy?: { start: string; end: string }[]; errors?: unknown[] }>;
};

/**
 * True if the calendar has any busy period overlapping [start, end) — the
 * actual double-booking prevention mechanism. Called with a fresh access
 * token immediately before booking, not cached, so it reflects the
 * calendar's real current state at the moment of booking.
 */
export async function hasConflict(
  accessToken: string,
  calendarId: string,
  start: Date,
  end: Date
): Promise<boolean> {
  const response = await fetch(`${CALENDAR_API_BASE}/freeBusy`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      timeMin: start.toISOString(),
      timeMax: end.toISOString(),
      items: [{ id: calendarId }],
    }),
  });

  if (!response.ok) {
    throw new Error(`Google FreeBusy check failed: ${response.status} ${await response.text()}`);
  }

  const data = (await response.json()) as FreeBusyResponse;
  const busy = data.calendars?.[calendarId]?.busy ?? [];
  return busy.length > 0;
}

export async function createCalendarEvent(
  accessToken: string,
  calendarId: string,
  params: { summary: string; description?: string; start: Date; end: Date }
): Promise<{ id: string; htmlLink?: string }> {
  const response = await fetch(
    `${CALENDAR_API_BASE}/calendars/${encodeURIComponent(calendarId)}/events`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        summary: params.summary,
        description: params.description,
        start: { dateTime: params.start.toISOString() },
        end: { dateTime: params.end.toISOString() },
      }),
    }
  );

  if (!response.ok) {
    throw new Error(`Failed to create calendar event: ${response.status} ${await response.text()}`);
  }

  return (await response.json()) as { id: string; htmlLink?: string };
}
