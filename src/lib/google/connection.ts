import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { decrypt } from "@/lib/crypto";
import { refreshAccessToken } from "./oauth";

export type CalendarAccess = { accessToken: string; calendarId: string };

/**
 * Resolves a ready-to-use access token for an organization's connected
 * calendar, or null if none is connected. Always refreshes rather than
 * caching an access token — see oauth.ts's refreshAccessToken for why.
 */
export async function getOrgCalendarAccess(
  supabase: SupabaseClient,
  organizationId: string
): Promise<CalendarAccess | null> {
  const { data: connection, error } = await supabase
    .from("calendar_connections")
    .select("google_refresh_token_encrypted, calendar_id")
    .eq("organization_id", organizationId)
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!connection?.google_refresh_token_encrypted || !connection.calendar_id) {
    return null;
  }

  const refreshToken = decrypt(connection.google_refresh_token_encrypted);
  const { accessToken } = await refreshAccessToken(refreshToken);

  return { accessToken, calendarId: connection.calendar_id };
}
