import { NextResponse, type NextRequest } from "next/server";
import { parseAndVerifyTwilioRequest } from "@/lib/twilio/webhook-request";
import { handleMissedCall, type DialCallStatus } from "@/lib/twilio/missed-call";
import { createServiceClient } from "@/lib/supabase/service";

const EMPTY_TWIML = new NextResponse("<Response></Response>", {
  headers: { "Content-Type": "text/xml" },
});

const VALID_STATUSES: DialCallStatus[] = ["completed", "busy", "no-answer", "failed", "canceled"];

// This is the <Dial action="..."> callback from app/api/webhooks/twilio/voice —
// Twilio posts here once the dial attempt to the owner's cell finishes.
export async function POST(request: NextRequest) {
  const params = await parseAndVerifyTwilioRequest(request);
  if (!params) {
    return new NextResponse("Invalid signature", { status: 403 });
  }

  const from = params.From;
  const to = params.To;
  const callSid = params.CallSid;
  const dialCallStatus = params.DialCallStatus;

  if (!from || !to || !callSid || !VALID_STATUSES.includes(dialCallStatus as DialCallStatus)) {
    return EMPTY_TWIML;
  }

  try {
    await handleMissedCall(createServiceClient(), {
      from,
      to,
      callSid,
      dialCallStatus: dialCallStatus as DialCallStatus,
    });
  } catch (err) {
    console.error("Failed to handle dial status callback", err);
  }

  return EMPTY_TWIML;
}
