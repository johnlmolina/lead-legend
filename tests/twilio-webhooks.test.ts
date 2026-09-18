// @vitest-environment node
//
// Tests the webhook *logic* modules directly (not the Route Handlers' HTTP
// layer) against the real Supabase project — same rationale as
// tenant-isolation.test.ts: there's no meaningful way to fake this with
// mocks, since the whole point is verifying organization-scoping and
// compliance enforcement against a real database.
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
  adminClient,
  createTestOrganization,
  cleanupTestOrganization,
  type TestOrgFixture,
} from "./helpers/supabase-admin";
import { handleInboundSms } from "@/lib/twilio/inbound-sms";
import { handleMissedCall } from "@/lib/twilio/missed-call";

const TWILIO_CONFIGURED = Boolean(process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN);

let orgA: TestOrgFixture;
let orgB: TestOrgFixture;

beforeAll(async () => {
  orgA = await createTestOrganization("twilio-a");
  orgB = await createTestOrganization("twilio-b");

  const admin = adminClient();
  await admin.from("organizations").update({ phone_number: "+15550001111" }).eq("id", orgA.organizationId);
  await admin.from("organizations").update({ phone_number: "+15550002222" }).eq("id", orgB.organizationId);
}, 30_000);

afterAll(async () => {
  if (orgA) await cleanupTestOrganization(orgA);
  if (orgB) await cleanupTestOrganization(orgB);
});

describe("handleInboundSms", () => {
  it("creates a new lead and message for an unknown number texting a known org number", async () => {
    const admin = adminClient();
    const from = "+15551110001";

    const result = await handleInboundSms(admin, { from, to: "+15550001111", body: "Hi there" });
    expect(result.handled).toBe(true);

    const { data: lead } = await admin
      .from("leads")
      .select("id, status, organization_id")
      .eq("organization_id", orgA.organizationId)
      .eq("phone", from)
      .single();
    expect(lead?.organization_id).toBe(orgA.organizationId);
    expect(lead?.status).toBe("contacted");

    const { data: conversation } = await admin
      .from("conversations")
      .select("id")
      .eq("lead_id", lead!.id)
      .single();
    const { data: messages } = await admin
      .from("messages")
      .select("body, direction, sender")
      .eq("conversation_id", conversation!.id);
    expect(messages).toEqual([{ body: "Hi there", direction: "inbound", sender: "lead" }]);
  });

  it("does not create a lead for a number not registered to any organization", async () => {
    const admin = adminClient();
    const result = await handleInboundSms(admin, {
      from: "+15551110099",
      to: "+15559999999",
      body: "hello?",
    });
    expect(result.handled).toBe(false);
  });

  it("scopes leads to the correct organization even when the same phone texts two different org numbers", async () => {
    const admin = adminClient();
    const from = "+15551110002";

    await handleInboundSms(admin, { from, to: "+15550001111", body: "message to org A" });
    await handleInboundSms(admin, { from, to: "+15550002222", body: "message to org B" });

    const { data: leadInA } = await admin
      .from("leads")
      .select("id")
      .eq("organization_id", orgA.organizationId)
      .eq("phone", from)
      .maybeSingle();
    const { data: leadInB } = await admin
      .from("leads")
      .select("id")
      .eq("organization_id", orgB.organizationId)
      .eq("phone", from)
      .maybeSingle();

    expect(leadInA).not.toBeNull();
    expect(leadInB).not.toBeNull();
    expect(leadInA!.id).not.toBe(leadInB!.id);
  });

  it("marks a lead opted out on STOP and does not resubscribe on an unrelated message", async () => {
    const admin = adminClient();
    const from = "+15551110003";

    await handleInboundSms(admin, { from, to: "+15550001111", body: "Hi, interested" });
    await handleInboundSms(admin, { from, to: "+15550001111", body: "STOP" });

    const { data: lead } = await admin
      .from("leads")
      .select("opt_out_status")
      .eq("organization_id", orgA.organizationId)
      .eq("phone", from)
      .single();
    expect(lead?.opt_out_status).toBe("opted_out");

    await handleInboundSms(admin, { from, to: "+15550001111", body: "hello again" });
    const { data: stillOptedOut } = await admin
      .from("leads")
      .select("opt_out_status")
      .eq("organization_id", orgA.organizationId)
      .eq("phone", from)
      .single();
    expect(stillOptedOut?.opt_out_status).toBe("opted_out");
  });

  it("resubscribes an opted-out lead on START", async () => {
    const admin = adminClient();
    const from = "+15551110004";

    await handleInboundSms(admin, { from, to: "+15550001111", body: "Hi" });
    await handleInboundSms(admin, { from, to: "+15550001111", body: "STOP" });
    await handleInboundSms(admin, { from, to: "+15550001111", body: "START" });

    const { data: lead } = await admin
      .from("leads")
      .select("opt_out_status")
      .eq("organization_id", orgA.organizationId)
      .eq("phone", from)
      .single();
    expect(lead?.opt_out_status).toBe("subscribed");
  });
});

describe("handleMissedCall", () => {
  it("logs a completed call without creating a lead", async () => {
    const admin = adminClient();
    const result = await handleMissedCall(admin, {
      from: "+15552220001",
      to: "+15550001111",
      callSid: "CA_test_completed",
      dialCallStatus: "completed",
    });
    expect(result.handled).toBe(true);

    const { data: lead } = await admin
      .from("leads")
      .select("id")
      .eq("organization_id", orgA.organizationId)
      .eq("phone", "+15552220001")
      .maybeSingle();
    expect(lead).toBeNull();
  });

  it("creates a lead and call_events row on no-answer before attempting any send", async () => {
    // The DB bookkeeping (lead + call_events + status bump) happens before
    // handleMissedCall ever calls sendSms, so it must be correct regardless
    // of whether the send itself succeeds. On a Twilio trial account, a real
    // send to an arbitrary (unverified) test number like this one is
    // expected to fail — trial accounts can only message pre-verified
    // recipients — so this tolerates that specific failure rather than
    // requiring a verified test number just to check the bookkeeping.
    const admin = adminClient();
    try {
      await handleMissedCall(admin, {
        from: "+15552220002",
        to: "+15550002222",
        callSid: "CA_test_noanswer",
        dialCallStatus: "no-answer",
      });
    } catch (err) {
      if (TWILIO_CONFIGURED && !/verified recipient/i.test(String(err))) {
        throw err;
      }
    }

    const { data: lead } = await admin
      .from("leads")
      .select("id, status")
      .eq("organization_id", orgB.organizationId)
      .eq("phone", "+15552220002")
      .single();
    expect(lead?.status).toBe("contacted");

    const { data: callEvent } = await admin
      .from("call_events")
      .select("status, lead_id")
      .eq("twilio_call_sid", "CA_test_noanswer")
      .single();
    expect(callEvent?.status).toBe("no-answer");
    expect(callEvent?.lead_id).toBe(lead!.id);
  });

  it("does not create anything for a number not registered to any organization", async () => {
    const admin = adminClient();
    const result = await handleMissedCall(admin, {
      from: "+15552220005",
      to: "+15559999998",
      callSid: "CA_test_nonumber",
      dialCallStatus: "no-answer",
    });
    expect(result.handled).toBe(false);
  });

  it("does not attempt to text a lead who is already do_not_contact", async () => {
    const admin = adminClient();
    const from = "+15552220003";

    await admin.from("leads").insert({
      organization_id: orgA.organizationId,
      phone: from,
      status: "do_not_contact",
    });

    const result = await handleMissedCall(admin, {
      from,
      to: "+15550001111",
      callSid: "CA_test_dnc",
      dialCallStatus: "busy",
    });

    expect(result.handled).toBe(true);
    expect(result.smsSent).toBe(false);
    expect(result.smsSkippedReason).toMatch(/do not contact/i);
  });

  // No automated test actually completes a real send end-to-end: doing so
  // needs the org's tracked number to be the real TWILIO_PHONE_NUMBER, but
  // organizations.phone_number is (correctly, per the migration above)
  // unique — the only org allowed to own that number in this database is
  // whichever real one you've configured it for (Demo Roofing Co), so a
  // test fixture can't safely borrow it. Twilio trial accounts also only
  // deliver to pre-verified recipient numbers, which rules out testing
  // against arbitrary numbers anyway. Verified manually instead: see
  // PROGRESS.md for the real send/receive walkthrough against Demo Roofing
  // Co once you have a verified recipient number or a paid account.
});
