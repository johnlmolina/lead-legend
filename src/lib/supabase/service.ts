import "server-only";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";

/**
 * Service-role client — BYPASSES ROW-LEVEL SECURITY ENTIRELY.
 *
 * Only for server-side code that runs before a user session exists (Twilio
 * webhooks, scheduled jobs) and therefore can't authenticate as a specific
 * user. Every query made with this client MUST include an explicit,
 * hand-checked `organization_id` filter — there is no database backstop here.
 * Never import this into anything that runs in response to a user request;
 * use `@/lib/supabase/server` for that.
 */
export function createServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error("Supabase service role is not configured");
  }
  return createSupabaseClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
