import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyTwilioSignature, sendSms } from "@/lib/sms";
import { draftReply, AI_ENABLED, type ConversationTurn } from "@/lib/ai";

const EMPTY_TWIML = new NextResponse("<Response></Response>", {
  headers: { "Content-Type": "text/xml" },
});

// Inbound SMS webhook — point your Twilio number's "A message comes in"
// webhook at POST https://<your-public-url>/api/webhooks/twilio/sms
export async function POST(request: NextRequest) {
  const formData = await request.formData();
  const params: Record<string, string> = {};
  formData.forEach((value, key) => {
    params[key] = String(value);
  });

  const signature = request.headers.get("x-twilio-signature") ?? "";
  const baseUrl = process.env.PUBLIC_APP_URL;
  const url = baseUrl ? `${baseUrl}/api/webhooks/twilio/sms` : request.url;

  if (!verifyTwilioSignature(signature, url, params)) {
    return new NextResponse("Invalid signature", { status: 403 });
  }

  const from = params.From;
  const to = params.To;
  const body = params.Body ?? "";
  if (!from || !to) return EMPTY_TWIML;

  // This prototype supports one Twilio number per user (set on the SMS
  // integration card) so an inbound text can be routed to the right account.
  const integration = await prisma.integration.findFirst({
    where: { provider: "SMS", phoneNumber: to },
  });
  if (!integration) return EMPTY_TWIML;

  let lead = await prisma.lead.findFirst({
    where: { userId: integration.userId, phone: from },
  });
  if (!lead) {
    lead = await prisma.lead.create({
      data: { userId: integration.userId, name: from, phone: from, source: "SMS", status: "NEW" },
    });
  }

  await prisma.message.create({
    data: { leadId: lead.id, channel: "SMS", direction: "INBOUND", body },
  });

  if (lead.status === "NEW") {
    await prisma.lead.update({ where: { id: lead.id }, data: { status: "CONTACTED" } });
  }

  if (AI_ENABLED) {
    try {
      const priorMessages = await prisma.message.findMany({
        where: { leadId: lead.id, channel: "SMS" },
        orderBy: { createdAt: "asc" },
      });
      const history: ConversationTurn[] = priorMessages.map((m) => ({
        role: m.direction === "INBOUND" ? "user" : "assistant",
        content: m.body,
      }));

      const reply = await draftReply(history);
      if (reply) {
        await sendSms(from, reply, to);
        await prisma.message.create({
          data: { leadId: lead.id, channel: "SMS", direction: "OUTBOUND", body: reply },
        });
      }
    } catch (err) {
      console.error("Failed to auto-reply to inbound SMS", err);
    }
  }

  return EMPTY_TWIML;
}
