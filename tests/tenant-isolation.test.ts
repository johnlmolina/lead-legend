// @vitest-environment node
//
// The single most important test in this codebase: Company A must never be
// able to read or write Company B's data, under any circumstance, including
// direct API access. This runs against your real Supabase project (see
// tests/helpers/supabase-admin.ts) — there is no meaningful way to fake RLS
// enforcement with mocks.
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
  anonClient,
  cleanupTestOrganization,
  type TestOrgFixture,
} from "./helpers/supabase-admin";

let orgA: TestOrgFixture;
let orgB: TestOrgFixture;

beforeAll(async () => {
  const { createTestOrganization } = await import("./helpers/supabase-admin");
  orgA = await createTestOrganization("a");
  orgB = await createTestOrganization("b");
}, 30_000);

afterAll(async () => {
  if (orgA) await cleanupTestOrganization(orgA);
  if (orgB) await cleanupTestOrganization(orgB);
});

async function signedInAs(fixture: TestOrgFixture) {
  const client = anonClient();
  const { error } = await client.auth.signInWithPassword({
    email: fixture.email,
    password: fixture.password,
  });
  if (error) throw error;
  return client;
}

describe("tenant isolation", () => {
  it("cannot read another organization's row directly by id", async () => {
    const asUserA = await signedInAs(orgA);

    const { data, error } = await asUserA
      .from("organizations")
      .select("id, name")
      .eq("id", orgB.organizationId)
      .maybeSingle();

    // RLS makes the row simply not visible — not an error, just absent.
    expect(error).toBeNull();
    expect(data).toBeNull();
  });

  it("cannot list another organization's leads", async () => {
    const asUserB = await signedInAs(orgB);
    const admin = (await import("./helpers/supabase-admin")).adminClient();

    // Seed a lead in org A directly (as admin, bypassing RLS for setup).
    const { data: lead, error: seedError } = await admin
      .from("leads")
      .insert({ organization_id: orgA.organizationId, phone: "+15555550100" })
      .select("id")
      .single();
    expect(seedError).toBeNull();

    const { data, error } = await asUserB
      .from("leads")
      .select("id")
      .eq("id", lead!.id);

    expect(error).toBeNull();
    expect(data).toEqual([]);
  });

  it("cannot insert a lead into another organization", async () => {
    const asUserA = await signedInAs(orgA);

    const { error } = await asUserA
      .from("leads")
      .insert({ organization_id: orgB.organizationId, phone: "+15555550101" });

    // RLS WITH CHECK violation — Postgres returns an explicit error on write,
    // unlike the silent filtering on reads.
    expect(error).not.toBeNull();
    expect(error?.message).toMatch(/row-level security/i);
  });

  it("cannot update another organization's lead", async () => {
    const asUserA = await signedInAs(orgA);
    const admin = (await import("./helpers/supabase-admin")).adminClient();

    const { data: lead } = await admin
      .from("leads")
      .insert({ organization_id: orgB.organizationId, phone: "+15555550102" })
      .select("id")
      .single();

    const { data, error } = await asUserA
      .from("leads")
      .update({ status: "won" })
      .eq("id", lead!.id)
      .select();

    expect(error).toBeNull();
    // No row matched under RLS, so nothing was updated.
    expect(data).toEqual([]);
  });

  it("can read and write its own organization's leads", async () => {
    const asUserA = await signedInAs(orgA);

    const { data: inserted, error: insertError } = await asUserA
      .from("leads")
      .insert({ organization_id: orgA.organizationId, phone: "+15555550199" })
      .select("id")
      .single();
    expect(insertError).toBeNull();

    const { data, error } = await asUserA
      .from("leads")
      .select("id")
      .eq("id", inserted!.id)
      .maybeSingle();

    expect(error).toBeNull();
    expect(data?.id).toBe(inserted!.id);
  });
});

describe("tenant isolation — conversations and messages", () => {
  it("cannot list another organization's conversations or messages", async () => {
    const admin = (await import("./helpers/supabase-admin")).adminClient();
    const asUserB = await signedInAs(orgB);

    const { data: leadA } = await admin
      .from("leads")
      .insert({ organization_id: orgA.organizationId, phone: "+15555550200" })
      .select("id")
      .single();
    const { data: conversationA } = await admin
      .from("conversations")
      .insert({ lead_id: leadA!.id, organization_id: orgA.organizationId, channel: "sms" })
      .select("id")
      .single();
    const { data: messageA } = await admin
      .from("messages")
      .insert({
        conversation_id: conversationA!.id,
        organization_id: orgA.organizationId,
        direction: "inbound",
        sender: "lead",
        body: "org A's secret message",
      })
      .select("id")
      .single();

    const { data: conversations, error: conversationsError } = await asUserB
      .from("conversations")
      .select("id")
      .eq("id", conversationA!.id);
    expect(conversationsError).toBeNull();
    expect(conversations).toEqual([]);

    const { data: messages, error: messagesError } = await asUserB
      .from("messages")
      .select("id, body")
      .eq("id", messageA!.id);
    expect(messagesError).toBeNull();
    expect(messages).toEqual([]);
  });

  it("cannot send a message into another organization's conversation", async () => {
    const admin = (await import("./helpers/supabase-admin")).adminClient();
    const asUserA = await signedInAs(orgA);

    const { data: leadB } = await admin
      .from("leads")
      .insert({ organization_id: orgB.organizationId, phone: "+15555550201" })
      .select("id")
      .single();
    const { data: conversationB } = await admin
      .from("conversations")
      .insert({ lead_id: leadB!.id, organization_id: orgB.organizationId, channel: "sms" })
      .select("id")
      .single();

    const { error } = await asUserA.from("messages").insert({
      conversation_id: conversationB!.id,
      organization_id: orgB.organizationId,
      direction: "outbound",
      sender: "human",
      body: "trying to inject a message into someone else's conversation",
    });

    expect(error).not.toBeNull();
    expect(error?.message).toMatch(/row-level security/i);
  });

  it("can create a conversation and exchange messages within its own organization, in order", async () => {
    const asUserA = await signedInAs(orgA);

    const { data: lead } = await asUserA
      .from("leads")
      .insert({ organization_id: orgA.organizationId, phone: "+15555550202" })
      .select("id")
      .single();
    await asUserA
      .from("conversations")
      .insert({ lead_id: lead!.id, organization_id: orgA.organizationId, channel: "sms" });
    const { data: conversation } = await asUserA
      .from("conversations")
      .select("id")
      .eq("lead_id", lead!.id)
      .single();

    for (const body of ["first", "second", "third"]) {
      const { error } = await asUserA.from("messages").insert({
        conversation_id: conversation!.id,
        organization_id: orgA.organizationId,
        direction: "outbound",
        sender: "human",
        body,
      });
      expect(error).toBeNull();
    }

    const { data: messages, error } = await asUserA
      .from("messages")
      .select("body")
      .eq("conversation_id", conversation!.id)
      .order("created_at", { ascending: true });

    expect(error).toBeNull();
    expect(messages?.map((m) => m.body)).toEqual(["first", "second", "third"]);
  });
});

describe("tenant isolation — lead status history", () => {
  it("cannot list another organization's lead status history", async () => {
    const admin = (await import("./helpers/supabase-admin")).adminClient();
    const asUserB = await signedInAs(orgB);

    const { data: leadA } = await admin
      .from("leads")
      .insert({ organization_id: orgA.organizationId, phone: "+15555550300" })
      .select("id")
      .single();
    const { data: historyRowA } = await admin
      .from("lead_status_history")
      .insert({
        lead_id: leadA!.id,
        organization_id: orgA.organizationId,
        from_status: "new",
        to_status: "contacted",
      })
      .select("id")
      .single();

    const { data, error } = await asUserB
      .from("lead_status_history")
      .select("id")
      .eq("id", historyRowA!.id);

    expect(error).toBeNull();
    expect(data).toEqual([]);
  });

  it("can read its own organization's lead status history", async () => {
    const admin = (await import("./helpers/supabase-admin")).adminClient();
    const asUserA = await signedInAs(orgA);

    const { data: leadA } = await admin
      .from("leads")
      .insert({ organization_id: orgA.organizationId, phone: "+15555550301" })
      .select("id")
      .single();
    const { data: historyRowA } = await admin
      .from("lead_status_history")
      .insert({
        lead_id: leadA!.id,
        organization_id: orgA.organizationId,
        from_status: "new",
        to_status: "contacted",
      })
      .select("id")
      .single();

    const { data, error } = await asUserA
      .from("lead_status_history")
      .select("id")
      .eq("id", historyRowA!.id)
      .maybeSingle();

    expect(error).toBeNull();
    expect(data?.id).toBe(historyRowA!.id);
  });
});

describe("tenant isolation — appointments", () => {
  it("cannot list or book into another organization's appointments", async () => {
    const admin = (await import("./helpers/supabase-admin")).adminClient();
    const asUserB = await signedInAs(orgB);

    const { data: leadA } = await admin
      .from("leads")
      .insert({ organization_id: orgA.organizationId, phone: "+15555550400" })
      .select("id")
      .single();
    const { data: apptA } = await admin
      .from("appointments")
      .insert({ lead_id: leadA!.id, organization_id: orgA.organizationId, scheduled_at: new Date().toISOString() })
      .select("id")
      .single();

    const { data: seen, error: readError } = await asUserB
      .from("appointments")
      .select("id")
      .eq("id", apptA!.id);
    expect(readError).toBeNull();
    expect(seen).toEqual([]);

    const { error: insertError } = await asUserB.from("appointments").insert({
      lead_id: leadA!.id,
      organization_id: orgA.organizationId,
      scheduled_at: new Date().toISOString(),
    });
    expect(insertError).not.toBeNull();
    expect(insertError?.message).toMatch(/row-level security/i);
  });
});

describe("tenant isolation — calendar connections", () => {
  it("cannot read, update, or delete another organization's calendar connection", async () => {
    const admin = (await import("./helpers/supabase-admin")).adminClient();
    const asUserB = await signedInAs(orgB);

    const { data: connA } = await admin
      .from("calendar_connections")
      .insert({ organization_id: orgA.organizationId, google_refresh_token_encrypted: "org-a-secret-token" })
      .select("id")
      .single();

    const { data: seen, error: readError } = await asUserB
      .from("calendar_connections")
      .select("id, google_refresh_token_encrypted")
      .eq("id", connA!.id);
    expect(readError).toBeNull();
    expect(seen).toEqual([]);

    const { data: deleted, error: deleteError } = await asUserB
      .from("calendar_connections")
      .delete()
      .eq("id", connA!.id)
      .select();
    expect(deleteError).toBeNull();
    expect(deleted).toEqual([]);

    // Confirm org A's row is still there — org B's delete truly was a no-op.
    const { data: stillThere } = await admin
      .from("calendar_connections")
      .select("id")
      .eq("id", connA!.id)
      .maybeSingle();
    expect(stillThere?.id).toBe(connA!.id);

    // organization_id is unique on this table — clean up so the next test
    // (which connects org A's own calendar) doesn't collide with this fixture row.
    await admin.from("calendar_connections").delete().eq("id", connA!.id);
  });

  it("an org admin can connect and then disconnect its own calendar", async () => {
    const asUserA = await signedInAs(orgA);

    const { data: inserted, error: insertError } = await asUserA
      .from("calendar_connections")
      .insert({ organization_id: orgA.organizationId, google_refresh_token_encrypted: "own-token" })
      .select("id")
      .single();
    expect(insertError).toBeNull();

    const { data: deleted, error: deleteError } = await asUserA
      .from("calendar_connections")
      .delete()
      .eq("id", inserted!.id)
      .select();
    expect(deleteError).toBeNull();
    expect(deleted).toHaveLength(1);
  });
});

describe("tenant isolation — FAQs and AI settings", () => {
  it("cannot list or create another organization's FAQs", async () => {
    const admin = (await import("./helpers/supabase-admin")).adminClient();
    const asUserB = await signedInAs(orgB);

    const { data: faqA } = await admin
      .from("faqs")
      .insert({ organization_id: orgA.organizationId, question: "q", answer: "a" })
      .select("id")
      .single();

    const { data: seen, error: readError } = await asUserB.from("faqs").select("id").eq("id", faqA!.id);
    expect(readError).toBeNull();
    expect(seen).toEqual([]);

    const { error: insertError } = await asUserB
      .from("faqs")
      .insert({ organization_id: orgA.organizationId, question: "q2", answer: "a2" });
    expect(insertError).not.toBeNull();
    expect(insertError?.message).toMatch(/row-level security/i);
  });

  it("cannot read another organization's AI settings", async () => {
    const admin = (await import("./helpers/supabase-admin")).adminClient();
    const asUserB = await signedInAs(orgB);

    await admin.from("ai_settings").insert({ organization_id: orgA.organizationId, disclosure_line: "org A's line" });

    const { data, error } = await asUserB
      .from("ai_settings")
      .select("disclosure_line")
      .eq("organization_id", orgA.organizationId);
    expect(error).toBeNull();
    expect(data).toEqual([]);
  });
});

describe("tenant isolation — call events, membership, and subscriptions", () => {
  it("cannot list another organization's call events", async () => {
    const admin = (await import("./helpers/supabase-admin")).adminClient();
    const asUserB = await signedInAs(orgB);

    const { data: eventA } = await admin
      .from("call_events")
      .insert({ organization_id: orgA.organizationId, status: "no-answer" })
      .select("id")
      .single();

    const { data, error } = await asUserB.from("call_events").select("id").eq("id", eventA!.id);
    expect(error).toBeNull();
    expect(data).toEqual([]);
  });

  it("cannot list another organization's membership roster", async () => {
    const asUserB = await signedInAs(orgB);

    const { data, error } = await asUserB
      .from("organization_members")
      .select("user_id")
      .eq("organization_id", orgA.organizationId);
    expect(error).toBeNull();
    expect(data).toEqual([]);
  });

  it("cannot read another organization's subscription", async () => {
    const admin = (await import("./helpers/supabase-admin")).adminClient();
    const asUserB = await signedInAs(orgB);

    await admin.from("subscriptions").insert({ organization_id: orgA.organizationId, plan: "starter", status: "trialing" });

    const { data, error } = await asUserB
      .from("subscriptions")
      .select("plan")
      .eq("organization_id", orgA.organizationId);
    expect(error).toBeNull();
    expect(data).toEqual([]);
  });
});
