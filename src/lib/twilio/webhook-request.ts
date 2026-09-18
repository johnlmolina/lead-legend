import "server-only";
import { type NextRequest } from "next/server";
import { verifyTwilioSignature } from "./client";

/**
 * Verifies the X-Twilio-Signature header and returns the parsed form params,
 * or null if the signature doesn't check out (forged/unsigned request —
 * callers should respond 403 in that case). PUBLIC_APP_URL is needed
 * because the signature is computed over the exact URL Twilio was
 * configured to POST to, which in local dev is a tunnel URL, not
 * request.url's localhost address.
 */
export async function parseAndVerifyTwilioRequest(
  request: NextRequest
): Promise<Record<string, string> | null> {
  const formData = await request.formData();
  const params: Record<string, string> = {};
  formData.forEach((value, key) => {
    params[key] = String(value);
  });

  const signature = request.headers.get("x-twilio-signature") ?? "";
  const baseUrl = process.env.PUBLIC_APP_URL;
  const url = baseUrl ? `${baseUrl}${new URL(request.url).pathname}` : request.url;

  if (!verifyTwilioSignature(signature, url, params)) {
    console.error("Rejected Twilio webhook request with an invalid signature", {
      path: new URL(request.url).pathname,
      hasSignatureHeader: signature.length > 0,
    });
    return null;
  }
  return params;
}
