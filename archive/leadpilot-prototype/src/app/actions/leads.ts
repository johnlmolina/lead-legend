"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { verifySession } from "@/lib/dal";
import {
  generateDemoLead,
  generateInboundMessage,
  generateAiReply,
  generateFollowUpInbound,
  generateCallSummary,
  nextBusinessDayAt,
} from "@/lib/simulate";
import { sendSms, SMS_ENABLED } from "@/lib/sms";
import { draftReply, AI_ENABLED, type ConversationTurn } from "@/lib/ai";

/**
 * Simulates a brand new lead arriving from CRM/AI-chat/SMS/website, being
 * worked by the AI responder, called, and booked onto the calendar as an
 * estimate — i.e. the full pipeline in the product diagram.
 */
export async function runDemoLead() {
  const session = await verifySession();
  const { name, phone, email, source, job } = generateDemoLead();

  const lead = await prisma.lead.create({
    data: {
      userId: session.userId,
      name,
      phone,
      email,
      source,
      status: "NEW",
    },
  });

  const channel = source === "SMS" ? "SMS" : "AI_CHAT";

  await prisma.message.create({
    data: {
      leadId: lead.id,
      channel,
      direction: "INBOUND",
      body: generateInboundMessage(job),
    },
  });

  await prisma.message.create({
    data: {
      leadId: lead.id,
      channel,
      direction: "OUTBOUND",
      body: generateAiReply(name, job),
    },
  });

  await prisma.message.create({
    data: {
      leadId: lead.id,
      channel,
      direction: "INBOUND",
      body: generateFollowUpInbound(),
    },
  });

  await prisma.lead.update({ where: { id: lead.id }, data: { status: "CONTACTED" } });

  await prisma.callLog.create({
    data: {
      leadId: lead.id,
      direction: "OUTBOUND",
      durationSeconds: 60 + Math.floor(Math.random() * 300),
      summary: generateCallSummary(job),
      outcome: "BOOKED",
    },
  });

  await prisma.lead.update({ where: { id: lead.id }, data: { status: "CALL_COMPLETED" } });

  await prisma.appointment.create({
    data: {
      leadId: lead.id,
      userId: session.userId,
      title: `Estimate: ${job} — ${name}`,
      type: "ESTIMATE",
      status: "SCHEDULED",
      scheduledAt: nextBusinessDayAt(9 + Math.floor(Math.random() * 7), 1 + Math.floor(Math.random() * 4)),
    },
  });

  await prisma.lead.update({ where: { id: lead.id }, data: { status: "ESTIMATE_BOOKED" } });

  revalidatePath("/dashboard");
  revalidatePath("/dashboard/leads");
  revalidatePath("/dashboard/calendar");

  return lead.id;
}

export async function updateLeadStatus(leadId: string, status: string) {
  const session = await verifySession();
  await prisma.lead.updateMany({
    where: { id: leadId, userId: session.userId },
    data: { status: status as never },
  });
  revalidatePath("/dashboard");
  revalidatePath("/dashboard/leads");
  revalidatePath(`/dashboard/leads/${leadId}`);
}

export async function sendManualReply(leadId: string, body: string) {
  const session = await verifySession();
  const lead = await prisma.lead.findFirst({ where: { id: leadId, userId: session.userId } });
  if (!lead) throw new Error("Lead not found");

  const channel = lead.source === "SMS" ? "SMS" : "AI_CHAT";
  let deliveryError: string | null = null;

  if (channel === "SMS") {
    const integration = await prisma.integration.findUnique({
      where: { userId_provider: { userId: session.userId, provider: "SMS" } },
    });
    if (integration?.connected) {
      if (SMS_ENABLED) {
        try {
          await sendSms(lead.phone, body, integration.phoneNumber ?? undefined);
        } catch (err) {
          deliveryError = err instanceof Error ? err.message : "Failed to send SMS.";
        }
      } else {
        deliveryError = "Twilio isn't configured yet (missing environment variables).";
      }
    }
  }

  await prisma.message.create({
    data: { leadId, channel, direction: "OUTBOUND", body },
  });

  if (lead.status === "NEW") {
    await prisma.lead.update({ where: { id: leadId }, data: { status: "CONTACTED" } });
  }

  revalidatePath(`/dashboard/leads/${leadId}`);
  return { deliveryError };
}

export async function generateAiDraft(leadId: string) {
  const session = await verifySession();
  const lead = await prisma.lead.findFirst({
    where: { id: leadId, userId: session.userId },
    include: { messages: { orderBy: { createdAt: "asc" } } },
  });
  if (!lead) throw new Error("Lead not found");
  if (!AI_ENABLED) throw new Error("ANTHROPIC_API_KEY isn't configured yet.");

  const channel = lead.source === "SMS" ? "SMS" : "AI_CHAT";
  const history: ConversationTurn[] = lead.messages
    .filter((m) => m.channel === channel)
    .map((m) => ({
      role: m.direction === "INBOUND" ? "user" : "assistant",
      content: m.body,
    }));

  if (history.length === 0) {
    history.push({
      role: "user",
      content: `New lead named ${lead.name} just came in. Write a friendly opening message offering a free estimate.`,
    });
  } else if (history[history.length - 1].role === "assistant") {
    history.push({
      role: "user",
      content: "(No reply from the lead yet — write a brief, friendly follow-up.)",
    });
  }

  return draftReply(history);
}

export async function logManualCall(leadId: string, summary: string, outcome: string) {
  const session = await verifySession();
  const lead = await prisma.lead.findFirst({ where: { id: leadId, userId: session.userId } });
  if (!lead) throw new Error("Lead not found");

  await prisma.callLog.create({
    data: {
      leadId,
      direction: "OUTBOUND",
      durationSeconds: 60 + Math.floor(Math.random() * 300),
      summary,
      outcome: outcome as never,
    },
  });

  await prisma.lead.update({ where: { id: leadId }, data: { status: "CALL_COMPLETED" } });

  revalidatePath(`/dashboard/leads/${leadId}`);
}

export async function bookEstimate(leadId: string, title: string, scheduledAt: string) {
  const session = await verifySession();
  const lead = await prisma.lead.findFirst({ where: { id: leadId, userId: session.userId } });
  if (!lead) throw new Error("Lead not found");

  await prisma.appointment.create({
    data: {
      leadId,
      userId: session.userId,
      title,
      type: "ESTIMATE",
      status: "SCHEDULED",
      scheduledAt: new Date(scheduledAt),
    },
  });

  await prisma.lead.update({ where: { id: leadId }, data: { status: "ESTIMATE_BOOKED" } });

  revalidatePath(`/dashboard/leads/${leadId}`);
  revalidatePath("/dashboard/calendar");
  revalidatePath("/dashboard");
}
