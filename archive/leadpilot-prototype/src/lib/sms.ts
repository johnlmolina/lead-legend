import "server-only";
import twilio from "twilio";
import { validateRequest } from "twilio/lib/webhooks/webhooks";

const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const defaultFromNumber = process.env.TWILIO_PHONE_NUMBER;

export const SMS_ENABLED = Boolean(accountSid && authToken && defaultFromNumber);

const client = accountSid && authToken ? twilio(accountSid, authToken) : null;

export async function sendSms(to: string, body: string, from?: string) {
  if (!client) throw new Error("Twilio is not configured");
  const fromNumber = from || defaultFromNumber;
  if (!fromNumber) throw new Error("No Twilio phone number configured");
  return client.messages.create({ to, from: fromNumber, body });
}

export function verifyTwilioSignature(
  signature: string,
  url: string,
  params: Record<string, string>
) {
  if (!authToken) return false;
  return validateRequest(authToken, signature, url, params);
}
