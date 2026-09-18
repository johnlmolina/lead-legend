# Lead Legend — Testing Strategy

## Principle

Per your process instructions: **no phase is done until it's tested**, and we don't
start the next phase until the current one's tests pass. This document defines what
"tested" means for each phase so that gate is checkable, not a vibe.

## Tooling

- **Vitest** — unit and integration tests for business logic (status transitions,
  guardrail filters, tenant-scoping query helpers).
- **React Testing Library** — component tests for the dashboard/lead views.
- **Playwright** — end-to-end tests for critical flows (signup → login → create lead
  → send message → book appointment).
- **A dedicated tenant-isolation suite** — not a category of unit test, but its own
  standing suite that runs from Phase 2 onward and grows with every new table: for
  every tenant-owned table, a test that logs in as Organization A and attempts to
  read/write a Organization B row directly via the API, asserting it's denied.

CI wiring (GitHub Actions running this on every push) is a Phase 10 deliverable, but
tests are written and run locally starting Phase 2 — we're not deferring testing
itself to the end, only the CI automation of it.

## Per-phase exit criteria

- **Phase 2 (DB + Auth)**: signup/login/password-reset flows pass Playwright tests;
  tenant-isolation suite exists and passes for `organizations`/`organization_members`/`leads`.
- **Phase 3 (Lead dashboard)**: ✅ done. Status-transition rules designed and unit
  tested (`src/lib/lead-status.ts` / `tests/lead-status.test.ts`) — forward
  pipeline, `lost → contacted` re-activation allowed, `won`/`do_not_contact`
  terminal. Component test for the status control
  (`tests/lead-status-control.test.tsx`). Tenant-isolation coverage for leads CRUD
  already existed from Phase 2. CSV parsing unit tested
  (`tests/csv.test.ts`). Full create → list → detail → status-change → CSV-import
  flow covered end-to-end (`e2e/leads.spec.ts`).
- **Phase 4 (Conversations)**: ✅ done. Tenant-isolation suite extended
  (`tests/tenant-isolation.test.ts`) — cannot list another org's
  conversations/messages, cannot insert into another org's conversation, and a
  same-organization round trip proves message ordering (`.order("created_at")`)
  is correct. Full send/simulate/ordering flow covered end-to-end
  (`e2e/conversations.spec.ts`). A unique DB index on
  `(lead_id, channel)` prevents duplicate conversations under concurrent
  callers (relevant once Phase 6 adds a webhook that can race a staff action).
- **Phase 5 (Anthropic)**: ✅ done. Deterministic guardrail filter unit tested
  against a 21-case adversarial table (`tests/guardrails.test.ts`) — pricing,
  insurance-coverage promises, legal advice, and false human claims all blocked;
  ordinary phrases like "free estimate" and "no cost" explicitly not
  false-positived. System prompt builder unit tested in isolation
  (`tests/system-prompt.test.ts`) — org FAQs/settings included, safety rules
  always appended regardless of org-configured instructions. Live end-to-end
  test against the real Anthropic API (`e2e/ai.spec.ts`, auto-skipped if
  `ANTHROPIC_API_KEY` isn't set) confirms a real drafted reply reaches the UI
  clean of pricing language and carries a visible interest assessment.
- **Phase 6 (Twilio)**: ✅ done. Signature verification tested at the real HTTP
  route (`e2e/twilio-signatures.spec.ts`) — missing header, forged header, and
  a genuinely valid signature (computed with Twilio's own
  `getExpectedTwilioSignature`) each get the correct 403/200. Opt-out
  enforcement tested at the send-path level, both as pure logic
  (`tests/compliance.test.ts`, `tests/opt-out.test.ts`) and end-to-end
  (`e2e/conversations.spec.ts`: sending to a Do Not Contact lead is blocked
  and nothing reaches the UI as sent). Inbound-SMS and missed-call → lead →
  follow-up flows tested against the real Supabase project
  (`tests/twilio-webhooks.test.ts`), including that two organizations never
  cross-contaminate leads from the same phone number texting both.
- **Phase 7 (Calendar)**: ✅ done. Refresh-token encryption round-trip and
  tamper detection tested (`tests/crypto.test.ts`). Appointment
  time/duration validation tested as pure logic
  (`tests/appointment-validation.test.ts`), separated from the actual
  conflict check specifically so it doesn't need a live calendar to test.
  The double-booking check itself (`hasConflict` against Google's real
  FreeBusy API) and the OAuth token refresh flow both needed a real
  connected calendar to exercise — unlike Supabase/Twilio, Google OAuth
  requires an actual human clicking through Google's consent screen with a
  real account, so this couldn't be faked with an admin API the way test
  fixtures are elsewhere in this suite. Verified live: connected a real
  Google account, booked a real estimate (event landed on the actual
  calendar), then attempted a second booking at the identical time slot on
  the same lead and confirmed it was rejected with "That time conflicts
  with something already on the calendar."
- **Phase 8 (Analytics)**: ✅ done. Each metric is a pure function tested
  against known fixture data (`tests/analytics.test.ts`): the conversion
  funnel (`computeFunnel`), lead source breakdown
  (`computeSourceBreakdown`), and average first-response time
  (`computeAvgFirstResponseMinutes`) — including the specific case that
  motivated using `lead_status_history` instead of current status: a lead
  that reached "qualified" and later moved to "lost" still counts toward
  "qualified" in the funnel. Also closed a pre-existing gap:
  `lead_status_history` has had RLS since Phase 2 but wasn't in the
  tenant-isolation suite; added it (`tests/tenant-isolation.test.ts`)
  since Phase 8 is the first feature to read it for a real calculation.
  Manually verified end-to-end against a real seeded organization —
  every number the page renders matched the fixture data exactly.
- **Phase 9 (Stripe)**: webhook handling tests (subscription created/canceled/payment
  failed) using Stripe's test-mode fixtures; plan-gating tests.
- **Phase 10**: ⏳ security review checklist done (see below), full
  regression pass done (build/lint clean, 120/120 unit tests, 15/15 e2e).
  CI workflow written (`.github/workflows/ci.yml`) but not yet running —
  this machine can't run `git` (Xcode Command Line Tools aren't installed),
  so the repo isn't pushed to GitHub yet and Actions has nothing to run
  against. Deployment smoke test pending the same blocker plus a Vercel
  account/login, which needs you. See `PROGRESS.md`'s Phase 10 entry.

## Security review checklist (Phase 10)

- [x] **RLS policy audit** — every one of the 12 tenant-owned tables
      (`organizations`, `organization_members`, `leads`,
      `lead_status_history`, `conversations`, `messages`, `call_events`,
      `appointments`, `calendar_connections`, `faqs`, `ai_settings`,
      `subscriptions`) has RLS enabled, and every one now has a
      tenant-isolation test in `tests/tenant-isolation.test.ts` that proves
      it — not just confirms the policy exists. This audit found and fixed
      a real bug: `calendar_connections` had select/insert/update policies
      but no delete policy, so the "Disconnect" button in Settings silently
      did nothing for every user. Fixed in
      `supabase/migrations/0007_calendar_connections_delete_policy.sql`,
      with a test proving an org can now disconnect its own calendar and
      still cannot delete another org's.
- [x] **No secret is reachable from client-side code** — grepped a fresh
      production build's `.next/static` for every server secret value
      (Supabase service role key, Anthropic key, Twilio auth token, Google
      client secret, token encryption key, database URL). None present;
      only the `NEXT_PUBLIC_*` values appear, as expected.
- [x] **All webhook handlers verify signatures before acting on payloads** —
      confirmed all three Twilio routes (`sms`, `voice`, `voice/status`)
      call `parseAndVerifyTwilioRequest` first and reject with 403 before
      touching the payload; `verifyTwilioSignature` fails closed (returns
      `false`, not "skip verification") if `TWILIO_AUTH_TOKEN` isn't set.
      The Google OAuth callback isn't a webhook but was checked too — it
      validates the `state` param against an httpOnly cookie set at
      connect time (CSRF protection), which is the correct mechanism for
      an authorization-code redirect. Added a `console.error` log on
      signature-verification failure (`src/lib/twilio/webhook-request.ts`)
      — previously these failed requests were silently 403'd with no
      record at all, which REQUIREMENTS.md §11 calls out as something that
      should be logged.
- [x] **Consent/opt-out/do-not-contact enforcement re-verified end to end** —
      traced every call site of `sendSms()`: there are exactly two
      (`src/app/actions/conversations.ts`, `src/lib/twilio/missed-call.ts`),
      and both call `canSendToLead()` first. No ungated path to send an SMS
      exists. Existing compliance/opt-out unit tests and the e2e
      Do-Not-Contact test still pass.
- [x] **Dependency vulnerability scan** — `npm audit` (prod and full):
      **0 vulnerabilities**.

Also fixed while auditing: `.gitignore`'s `.env*` pattern was accidentally
excluding `.env.local.example` (the intentionally-tracked setup doc, not a
secret) from ever being committed; narrowed it to `.env`/`.env.local`/
`.env.*.local`. And removed a dead `/reset-password` entry from the
proxy's public-path allowlist (`src/lib/supabase/proxy.ts`) — that route
doesn't exist; the real one is `/forgot-password`, already listed
separately.
