import "server-only";

const CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;

export const GOOGLE_CALENDAR_ENABLED = Boolean(CLIENT_ID && CLIENT_SECRET);

const SCOPE = "https://www.googleapis.com/auth/calendar";

function redirectUri(): string {
  const base = process.env.PUBLIC_APP_URL || "http://localhost:3000";
  return `${base}/api/integrations/google/callback`;
}

/**
 * `access_type=offline` + `prompt=consent` together guarantee Google issues
 * a refresh token on every authorization — without `prompt=consent`,
 * re-authorizing (e.g. reconnecting after a disconnect) silently omits the
 * refresh token if the user already granted access once before.
 */
export function getGoogleAuthUrl(state: string): string {
  if (!CLIENT_ID) throw new Error("GOOGLE_CLIENT_ID is not configured");

  const params = new URLSearchParams({
    client_id: CLIENT_ID,
    redirect_uri: redirectUri(),
    response_type: "code",
    scope: SCOPE,
    access_type: "offline",
    prompt: "consent",
    state,
  });
  return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
}

type TokenResponse = {
  access_token: string;
  refresh_token?: string;
  expires_in: number;
  error?: string;
  error_description?: string;
};

export async function exchangeCodeForTokens(
  code: string
): Promise<{ accessToken: string; refreshToken: string; expiresIn: number }> {
  if (!CLIENT_ID || !CLIENT_SECRET) throw new Error("Google OAuth is not configured");

  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: CLIENT_ID,
      client_secret: CLIENT_SECRET,
      redirect_uri: redirectUri(),
      grant_type: "authorization_code",
    }),
  });

  const data = (await response.json()) as TokenResponse;
  if (!response.ok || !data.refresh_token) {
    throw new Error(
      data.error_description ||
        data.error ||
        "Google did not return a refresh token. Try disconnecting and reconnecting."
    );
  }

  return { accessToken: data.access_token, refreshToken: data.refresh_token, expiresIn: data.expires_in };
}

/**
 * Called on every calendar API request rather than caching an access token
 * with its expiry — refresh-token exchange is cheap and this avoids storing
 * and reasoning about access-token expiry state anywhere.
 */
export async function refreshAccessToken(
  refreshToken: string
): Promise<{ accessToken: string; expiresIn: number }> {
  if (!CLIENT_ID || !CLIENT_SECRET) throw new Error("Google OAuth is not configured");

  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      refresh_token: refreshToken,
      client_id: CLIENT_ID,
      client_secret: CLIENT_SECRET,
      grant_type: "refresh_token",
    }),
  });

  const data = (await response.json()) as TokenResponse;
  if (!response.ok) {
    throw new Error(data.error_description || data.error || "Failed to refresh Google access token.");
  }

  return { accessToken: data.access_token, expiresIn: data.expires_in };
}
