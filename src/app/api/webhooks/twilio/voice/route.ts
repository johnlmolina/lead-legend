import { NextResponse, type NextRequest } from "next/server";
import { parseAndVerifyTwilioRequest } from "@/lib/twilio/webhook-request";
import { handleMissedCall } from "@/lib/twilio/missed-call";
import { createServiceClient } from "@/lib/supabase/service";

function twiml(xml: string) {
  return new NextResponse(xml, { headers: { "Content-Type": "text/xml" } });
}

function escapeXml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

// Point a Twilio number's "A call comes in" webhook at
// POST https://<your-public-url>/api/webhooks/twilio/voice
//
// Per the confirmed design, the number rings the owner/staff's real cell
// first (via <Dial>) — this is not a dedicated tracking line that never
// rings. Only a true no-answer/busy/failed/canceled outcome (reported to
// the action URL below) counts as "missed".
export async function POST(request: NextRequest) {
  const params = await parseAndVerifyTwilioRequest(request);
  if (!params) {
    return new NextResponse("Invalid signature", { status: 403 });
  }

  const to = params.To;
  const from = params.From;
  const callSid = params.CallSid;

  const admin = createServiceClient();
  const { data: organization } = await admin
    .from("organizations")
    .select("forwarding_phone_number")
    .eq("phone_number", to)
    .maybeSingle();

  if (!organization?.forwarding_phone_number) {
    // No one configured to ring — this is an immediate miss, not a dial
    // outcome to wait for.
    try {
      await handleMissedCall(admin, { from, to, callSid, dialCallStatus: "no-answer" });
    } catch (err) {
      console.error("Failed to handle unconfigured-forwarding missed call", err);
    }
    return twiml(
      "<Response><Say>Thanks for calling. We're not able to take your call right now, but we'll text you shortly.</Say></Response>"
    );
  }

  const statusCallbackUrl = process.env.PUBLIC_APP_URL
    ? `${process.env.PUBLIC_APP_URL}/api/webhooks/twilio/voice/status`
    : undefined;

  const actionAttr = statusCallbackUrl ? ` action="${escapeXml(statusCallbackUrl)}"` : "";

  return twiml(
    `<Response><Dial timeout="20" callerId="${escapeXml(to)}"${actionAttr}><Number>${escapeXml(
      organization.forwarding_phone_number
    )}</Number></Dial></Response>`
  );
}
