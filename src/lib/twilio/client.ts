import "server-only";
import twilio from "twilio";
import { validateRequest } from "twilio/lib/webhooks/webhooks";

const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;

export const TWILIO_ENABLED = Boolean(accountSid && authToken);

const client = accountSid && authToken ? twilio(accountSid, authToken) : null;

/**
 * Sends a real SMS. Callers are responsible for the compliance check
 * (src/lib/compliance.ts) — this function just dispatches; it doesn't know
 * about lead status.
 */
export async function sendSms(to: string, from: string, body: string) {
  if (!client) throw new Error("Twilio is not configured");
  return client.messages.create({ to, from, body });
}

export function verifyTwilioSignature(
  signature: string,
  url: string,
  params: Record<string, string>
): boolean {
  if (!authToken) return false;
  return validateRequest(authToken, signature, url, params);
}
