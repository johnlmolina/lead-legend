# Lead Legend — Requirements

Status: **Phase 1 draft**, pending your review before Phase 2 begins.

Lead Legend is a multi-tenant SaaS for residential roofing organizations. It recovers
missed calls, follows up on new and existing leads, and converts more leads into
booked roof inspections/estimates.

This document restates and organizes the requirements you gave me, so we have one
place to check every later phase against. Where I've made an interpretation call,
it's marked **[decision]** — flag anything you want changed.

## 1. Tenancy model

- Each roofing organization is a **tenant** ("Organization").
- **Confirmed:** a tenant can have more than one human user (owner + staff), via a
  `organization_members` join table with a role.
- A user must never be able to read or write another organization's data, under any
  circumstance, including direct API/DB access — not just hidden in the UI.

## 2. Authentication

- Sign up, log in, reset password, manage profile — via Supabase Auth.
- Every authenticated request must resolve to exactly one organization (via
  `organization_members`) before any data access is allowed.

## 3. Lead management

Each client can:
- View leads, add leads, import leads (bulk import — format TBD, likely CSV).
- View lead status, conversation history, appointment status.

Lead statuses (fixed set, in order):

1. New
2. Contacted
3. Engaged
4. Qualified
5. Appointment booked
6. Appointment completed
7. Won
8. Lost
9. Do not contact — a compliance status, not just a pipeline stage: once set, no
   further outbound automated messages may be sent to this lead under any
   circumstance. This needs to be enforced at the sending layer, not just the UI.

## 4. Conversation system

- SMS conversations between a lead and the roofing organization, threaded per lead.
- Full history visible to the client.

## 5. AI assistant

The AI must:
- Identify itself appropriately. **[decision — needs your input, not mine]** Whether
  it must disclose it's automated depends on your target markets' telecom/marketing
  laws (this varies by state and is a live, evolving legal area for AI-driven texting).
  I can build the technical hook (a configurable disclosure line, on by default) but
  I'm not qualified to tell you what's legally sufficient — that call needs a lawyer
  before you message real customers.
- Answer FAQs the client has approved (from their Settings-configured FAQ list only —
  not open-ended knowledge).
- Collect basic lead info (name, address/service area, roof concern, timeline).
- Judge interest level, to drive status transitions (e.g. into "Engaged"/"Qualified").
- Help schedule an appointment (hand off to the Calendar booking flow).
- Never invent pricing.
- Never make promises about insurance coverage.
- Never give professional/legal/insurance advice.
- Escalate to a human when appropriate (configurable triggers — see Settings).

These are safety-critical constraints, not style preferences. Phase 5's design needs
to treat "the AI violated a guardrail" as a bug class with its own tests, not just
prompt wording — see `ARCHITECTURE.md` for the enforcement approach.

## 6. Missed call workflow

When a tracked business number gets a missed call:
- Create or update the lead.
- Trigger an appropriate follow-up (e.g. an automatic "sorry we missed you" SMS).
- Record all activity.
- Client can see the resulting conversation.

Open question for Phase 6: what happens to the call itself — forwarded to the owner's
cell, sent to voicemail, or both? This changes the Twilio call-flow design and needs
an answer before that phase starts.

## 7. Appointments

- Google Calendar integration, per organization (each organization connects its own calendar).
- Qualified leads can book an available slot.
- Must prevent double-booking.

## 8. Dashboard

Shows: leads, conversations, appointments, conversion metrics, recent activity.

## 9. Settings

Client can configure: business name, phone number, business hours, service area,
services offered, FAQs, calendar connection, AI behavior, human escalation rules.

## 10. Billing (deferred)

Stripe subscriptions — Starter, Professional, Agency. **Explicitly not built until
the core product works**, per your instructions. Included here for completeness only.

## 11. Security requirements

- Strict tenant isolation (enforced at the database layer, not just app code).
- Server-side authorization on every read/write.
- Validate all external input (webhooks, forms, imports).
- Never expose API keys to the browser.
- Secrets only in environment variables.
- Log important security events (auth failures, cross-tenant access attempts, webhook
  signature failures).
- Don't store sensitive data that isn't needed.

## 12. Compliance

- The system must support consent status, opt-out status, and do-not-contact status
  as first-class data, wired into the actual send path (a lead in one of these states
  cannot receive an automated message — enforced in code, not just policy).
- Must not be built to circumvent telecom/marketing law (e.g. TCPA-style rules in the
  US: honoring STOP/START keywords, avoiding disallowed calling hours, etc.).
- **This document and the code that follows are engineering controls, not legal
  advice.** I'll implement the technical guardrails described here, but whether
  they're sufficient for your specific markets is a question for a telecom/marketing
  lawyer, not for me. Flagging this once, clearly, so it doesn't get lost.

## 13. Explicitly out of scope for now

- Stripe billing (until core product works).
- Anything beyond SMS for the conversation channel (no voice-AI, no email, unless you
  ask for it later).
- Multi-language support (not mentioned in the spec; assumed English-only for v1).
