import { NextResponse, type NextRequest } from "next/server";
import { parseAndVerifyTwilioRequest } from "@/lib/twilio/webhook-request";
import { handleInboundSms } from "@/lib/twilio/inbound-sms";
import { createServiceClient } from "@/lib/supabase/service";

const EMPTY_TWIML = new NextResponse("<Response></Response>", {
  headers: { "Content-Type": "text/xml" },
});

// Point a Twilio number's "A message comes in" webhook at
// POST https://<your-public-url>/api/webhooks/twilio/sms
export async function POST(request: NextRequest) {
  const params = await parseAndVerifyTwilioRequest(request);
  if (!params) {
    return new NextResponse("Invalid signature", { status: 403 });
  }

  const from = params.From;
  const to = params.To;
  const body = params.Body ?? "";
  if (!from || !to) return EMPTY_TWIML;

  try {
    await handleInboundSms(createServiceClient(), { from, to, body });
  } catch (err) {
    console.error("Failed to handle inbound SMS", err);
  }

  return EMPTY_TWIML;
}
