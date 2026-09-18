import { test, expect } from "@playwright/test";
import { getExpectedTwilioSignature } from "twilio/lib/webhooks/webhooks";

const AUTH_TOKEN = process.env.TWILIO_AUTH_TOKEN;

test.describe("Twilio webhook signature verification", () => {
  test.skip(!AUTH_TOKEN, "TWILIO_AUTH_TOKEN is not configured");

  test("rejects a request with no signature header", async ({ request }) => {
    const response = await request.post("/api/webhooks/twilio/sms", {
      form: { From: "+15551234567", To: "+15557654321", Body: "hi" },
    });
    expect(response.status()).toBe(403);
  });

  test("rejects a request with a forged signature", async ({ request }) => {
    const response = await request.post("/api/webhooks/twilio/sms", {
      form: { From: "+15551234567", To: "+15557654321", Body: "hi" },
      headers: { "X-Twilio-Signature": "not-a-real-signature" },
    });
    expect(response.status()).toBe(403);
  });

  test("accepts a request with a genuinely valid signature", async ({ request, baseURL }) => {
    const url = `${baseURL}/api/webhooks/twilio/sms`;
    const params = { From: "+15551234567", To: "+15559999999", Body: "hi" };
    const signature = getExpectedTwilioSignature(AUTH_TOKEN!, url, params);

    const response = await request.post("/api/webhooks/twilio/sms", {
      form: params,
      headers: { "X-Twilio-Signature": signature },
    });

    // 200 either way (route always returns empty TwiML, even for an
    // unrecognized "To" number) — the point here is it's not a 403, i.e.
    // the signature was accepted.
    expect(response.status()).toBe(200);
  });
});
