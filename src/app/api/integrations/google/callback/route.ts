import { NextResponse, type NextRequest } from "next/server";
import { cookies } from "next/headers";
import { requireOrganization } from "@/lib/dal";
import { exchangeCodeForTokens } from "@/lib/google/oauth";
import { encrypt } from "@/lib/crypto";

const STATE_COOKIE = "google_oauth_state";

function redirectToSettings(request: NextRequest, status: "connected" | "error", message?: string) {
  const url = new URL("/dashboard/settings", request.url);
  url.searchParams.set("calendar", status);
  if (message) url.searchParams.set("calendar_error", message);
  return NextResponse.redirect(url);
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const state = searchParams.get("state");
  const error = searchParams.get("error");

  const cookieStore = await cookies();
  const expectedState = cookieStore.get(STATE_COOKIE)?.value;
  cookieStore.delete(STATE_COOKIE);

  if (error) {
    return redirectToSettings(request, "error", error === "access_denied" ? "Access was denied." : error);
  }
  if (!code || !state || !expectedState || state !== expectedState) {
    return redirectToSettings(request, "error", "Invalid or expired authorization request. Try again.");
  }

  // requireOrganization() redirects to /login on its own if the session is
  // somehow gone — the user's Supabase session cookie survives the trip to
  // Google's consent screen and back since it's a same-site redirect chain
  // through the browser, not a server-to-server call.
  const { supabase, membership } = await requireOrganization();

  try {
    const tokens = await exchangeCodeForTokens(code);
    const encryptedRefreshToken = encrypt(tokens.refreshToken);

    const { error: upsertError } = await supabase.from("calendar_connections").upsert({
      organization_id: membership.organization_id,
      google_refresh_token_encrypted: encryptedRefreshToken,
      calendar_id: "primary",
      connected_at: new Date().toISOString(),
    });
    if (upsertError) throw new Error(upsertError.message);
  } catch (err) {
    return redirectToSettings(
      request,
      "error",
      err instanceof Error ? err.message : "Failed to connect Google Calendar."
    );
  }

  return redirectToSettings(request, "connected");
}
