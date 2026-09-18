# Lead Legend — Architecture Proposal (Phase 1)

This is a proposal, not a decision — call out anything you want changed before
Phase 2 starts, since the auth/tenancy choices here are expensive to reverse later.

## 1. Stack

| Layer | Choice | Why |
|---|---|---|
| Framework | Next.js (App Router) + TypeScript | Per spec; Server Components + Server Actions keep external API calls server-only by construction. |
| Database | PostgreSQL via Supabase | Per spec; gives us Row-Level Security (RLS) as a database-enforced tenant boundary, not just app-layer discipline. |
| Auth | Supabase Auth | Per spec; handles signup/login/password-reset/session out of the box, and its JWTs are what RLS policies check against. |
| DB access | `@supabase/supabase-js` + `@supabase/ssr`, with types generated from the live schema (`supabase gen types typescript`) | **Confirmed** — Supabase client only, no second ORM. Keeps RLS as the actual enforcement point — see §3. |
| AI | Anthropic API (Claude), server-side only | Per spec. Structured tool-output for lead assessment — see §5. |
| SMS | Twilio | Per spec. |
| Calendar | Google Calendar API, OAuth2 per organization | Per spec. |
| Billing | Stripe | Per spec — schema planned now, implementation deferred to Phase 9. |
| Hosting | Vercel | Per spec. |
| Tests | Vitest + React Testing Library (unit/integration), Playwright (e2e) | Fast, ESM-native, standard Next.js pairing. |

## 2. High-level shape

```
Browser (tenant staff)
   │  HTTPS
   ▼
Next.js on Vercel
   ├─ Server Components / Server Actions ── Supabase Postgres (RLS-enforced)
   ├─ Route Handlers (webhooks) ──────────── Twilio (SMS + Voice status callbacks)
   ├─ Route Handlers / Server Actions ────── Anthropic API (AI drafting)
   ├─ Route Handlers (OAuth callback) ─────── Google Calendar API
   └─ Route Handlers (webhooks, Phase 9) ──── Stripe

Lead's phone ── SMS/voice ── Twilio ── webhook ── Next.js ── Postgres
```

Every external API key (Anthropic, Twilio, Google, Stripe) lives only in server-side
environment variables and is only ever touched from Server Components, Server
Actions, or Route Handlers — never shipped to the browser bundle.

## 3. Tenant isolation

This is the requirement with zero tolerance for being "mostly right," so it gets the
strongest mechanism available rather than the most convenient one.

- Every tenant-owned table carries a `organization_id` column.
- Postgres RLS policies on every such table restrict rows to organizations the
  requesting user belongs to, via a `organization_members(user_id, organization_id, role)`
  table: `USING (organization_id IN (SELECT organization_id FROM organization_members WHERE user_id
  = auth.uid()))`.
- This means even a bug in application code (a missing `WHERE organization_id = ...`)
  **cannot** leak another tenant's rows, because the database itself refuses the
  query. App-layer filtering (what the LeadPilot prototype did) is kept too, as
  defense in depth, but RLS is the actual guarantee.
- Service-role access (the Twilio/Anthropic/Calendar webhook handlers, which act
  before a user session exists) uses the Supabase service key, which bypasses RLS —
  so those handlers must do their own explicit `organization_id` resolution and scoping in
  code, carefully. This is the one place tenant isolation is app-layer, not DB-layer,
  and it's exactly where Phase 2's test suite needs the most attention (see
  `TESTING.md`).
- Phase 2's exit criteria includes an automated test that logs in as tenant A and
  attempts to read/write tenant B's leads directly against the API — expected result:
  denied, every time.

## 4. Data model (proposed entities)

Not final DDL — enough to validate the shape before Phase 2 writes migrations.

- **organizations** — id, name, phone_number, business_hours, service_area, services_offered, created_at
- **organization_members** — user_id (→ auth.users), organization_id, role (owner/admin/agent)
- **leads** — id, organization_id, name, phone, email, address, source, status (enum, §Lead statuses), consent_status, opt_out_status, created_at
- **lead_status_history** — id, lead_id, from_status, to_status, changed_by, changed_at — audit trail, also feeds the dashboard's "recent activity" and conversion metrics
- **conversations** — id, lead_id, organization_id, channel (sms), created_at
- **messages** — id, conversation_id, direction (inbound/outbound), sender (lead/ai/human), body, twilio_sid, created_at
- **call_events** — id, organization_id, lead_id, twilio_call_sid, status (no-answer/busy/completed), occurred_at
- **appointments** — id, lead_id, organization_id, google_event_id, scheduled_at, status
- **calendar_connections** — id, organization_id, google_refresh_token (encrypted), calendar_id, connected_at
- **faqs** — id, organization_id, question, answer
- **ai_settings** — organization_id, tone/persona config, escalation triggers, disclosure line
- **subscriptions** (Phase 9) — organization_id, stripe_customer_id, stripe_subscription_id, plan, status

`consent_status` and `opt_out_status` live directly on `leads` (not buried in a
settings blob) precisely so the send path can check them with a plain, fast,
impossible-to-miss query before anything goes out.

## 5. AI assistant design

Two engineering choices exist specifically to make the guardrails in
`REQUIREMENTS.md` §5 enforceable rather than just requested in a prompt:

1. **Structured output, not free text parsing.** The AI call uses Claude's
   tool-use/structured-output feature to return a typed result (e.g.
   `{ reply_text, intent: "interested"|"not_interested"|"unclear", qualified:
   boolean, wants_human: boolean }`) instead of us regex-parsing prose to decide
   status transitions. This makes "did the AI think this lead is qualified" a typed
   field we can test, not a guess.
2. **A deterministic guardrail filter runs on every AI-drafted message before it can
   be sent** — a small, boring, non-AI check for patterns that must never go out
   verbatim (dollar amounts/pricing language, "covered by insurance" or similar
   coverage claims, legal-advice phrasing). A match blocks the send and routes to
   human escalation instead. This is a backstop, not a substitute for the system
   prompt — LLMs are probabilistic, and a safety property that only lives in a prompt
   is a property that will eventually be violated.

The system prompt itself is assembled per-organization at request time from
`ai_settings` and `faqs` — no hard-coded business content — with the guardrail
instructions appended last, non-overridable by tenant configuration.

## 6. Missed call workflow

**Confirmed:** the tracked number rings through to the owner/staff's real cell
first via Twilio's `<Dial>`, and only counts as missed on true no-answer/busy —
not a dedicated line that never rings anywhere.

Twilio Voice webhook on the tracked number receives call status callbacks. On
`no-answer`/`busy` (after the `<Dial>` attempt completes without being
answered), the handler: creates/updates the lead, writes a `call_events` row,
and triggers a follow-up SMS.

**Confirmed:** when a lead texts back, a human reviews every AI-drafted reply
before it sends (the Phase 5 "Suggest with AI" pattern) — inbound messages are
never auto-replied-to autonomously. This can move to fully autonomous later
once the guardrails have more real-world track record; not a decision to make
this early.

## 7. Calendar integration

Each organization connects its own Google Calendar via OAuth2 (Route Handler callback).
Refresh tokens are encrypted before storage (Supabase Vault if available in your
project's plan, otherwise application-level AES-GCM with a server-only key) — a
plaintext OAuth refresh token in the database is a standing compromise risk. Booking
checks free/busy before writing the event to prevent double-booking.

## 8. Deployment

Vercel for the app; Supabase for Postgres + Auth (+ Vault if used). Environment
variables set in the Vercel project (production) and `.env.local` (dev), documented
in `README.md` once Phase 2 defines the real variable list.

## 9. Risks & dependencies

| Risk | Notes |
|---|---|
| **Legal/compliance** | Consent, opt-out, and AI-disclosure requirements vary by jurisdiction and are evolving. I can build the technical controls (§5, `consent_status`/`opt_out_status`, STOP/START handling in Phase 6) but this is not a substitute for legal review before real customer traffic. |
| **RLS misconfiguration** | The single highest-impact bug class for this product — a wrong policy leaks a tenant's customer data. Mitigated by the dedicated cross-tenant test suite from Phase 2 onward (see `TESTING.md`), but worth you knowing this is the risk I'm most deliberately over-engineering against. |
| **AI hallucination on pricing/insurance** | Mitigated by structured output + deterministic filter (§5), but no filter is perfect — plan for a human-review sampling process once live. |
| **Third-party account setup is a hard dependency** | Real testing of Phases 5-7 needs live accounts: Supabase project, Anthropic key, Twilio number, Google Cloud OAuth credentials. Each is a blocking step outside my control, same friction we hit with the LeadPilot prototype. |
| **Vercel function time limits** | Webhook handlers (Twilio, Calendar) must stay fast/synchronous at this scale; if volume grows enough to need background queuing, that's a post-MVP architecture change, not a Phase 2-10 concern. |
| **Google OAuth token expiry/refresh** | Needs explicit handling in Phase 7; a silently-expired calendar connection is a booking failure the client won't notice until a lead complains. |
| **Cost dependencies** | Twilio per-message/per-minute, Anthropic per-token, Google Calendar API quotas — all scale with usage; worth monitoring once billing (Phase 9) exists to tie usage to plan limits. |

## 10. Decisions

- ~~Multi-user organizations vs. one login per organization~~ — **confirmed: multi-user.**
- ~~Supabase-client-only vs. Prisma-on-top~~ — **confirmed: Supabase-client-only.**
- ~~Missed-call ring behavior~~ — **confirmed: forward to owner's cell, missed only on true no-answer.** (§6)
- ~~AI auto-reply vs. human review~~ — **confirmed: human reviews every reply for now**, matching Phase 5's "Suggest with AI" pattern. Revisit once guardrails have more real-world track record. (§6)
- AI disclosure wording/requirement — still open. A legal question, not an
  engineering one; the technical hook (§5) is built either way.
