# Lead Legend — Progress

Living status log. Updated at the end of every phase (and whenever something
material changes mid-phase).

## Phase checklist

- [x] **Phase 1 — Architecture & specification**
- [x] **Phase 2 — Database schema + Supabase Auth**
- [x] **Phase 3 — Lead management dashboard**
- [x] **Phase 4 — Conversation system**
- [x] **Phase 5 — Anthropic integration**
- [x] **Phase 6 — Twilio integration**
- [x] **Phase 7 — Google Calendar integration**
- [x] **Phase 8 — Analytics**
- [ ] Phase 9 — Stripe billing
- [~] **Phase 10 — Security review, testing, deployment, docs** (security
      review, regression pass, and CI all done and green; deployment to
      Vercel remaining — see log)

## Log

### 2026-09-08 — Phase 1 complete

- Replaced the earlier "LeadPilot" prototype (generic home-services demo on
  Next.js/SQLite/custom auth) with this project, per your decision to build
  RoofLead Recovery/**Lead Legend** as its own product rather than extend that
  codebase. The old prototype is preserved, untouched, at
  `archive/leadpilot-prototype/` — nothing was deleted.
- Wrote `REQUIREMENTS.md`, `ARCHITECTURE.md`, `TESTING.md`, and this file.
- No application code has been written yet, per your explicit Phase 1 instruction.
- **Open decisions that need your answer before later phases** (also listed in
  `ARCHITECTURE.md` §10):
  - Multi-user organizations vs. one login per organization — assumed multi-user.
  - Supabase-client-only vs. Prisma-on-top for DB access — recommended
    Supabase-client-only so RLS is the enforcement point.
  - Missed-call ring behavior (forward to owner's cell vs. dedicated tracking line)
    — needed before Phase 6.
  - AI disclosure requirement/wording — a legal question, needed before Phase 5.
- **Not yet started, blocking real integration testing later**: you'll need a
  Supabase project, an Anthropic API key, a Twilio account + number, and Google
  Cloud OAuth credentials before Phases 5-7 can be tested against real services.
  None of these are needed yet for Phase 2 or 3.

### 2026-09-08 — Decisions confirmed, Phase 2 starting

- You confirmed: multi-user organizations, and Supabase-client-only (no Prisma). Both
  updated from "assumed" to "confirmed" in `ARCHITECTURE.md` and `REQUIREMENTS.md`.
- Missed-call ring behavior and AI disclosure wording are deferred — you'll revisit
  before Phases 6 and 5 respectively.
- Environment check for Phase 2: this machine has no Docker and no local Postgres,
  and `git` is present but non-functional (blocked on missing Xcode Command Line
  Tools, same issue hit during the LeadPilot prototype). Local Supabase
  (`supabase start`) needs Docker, which isn't available and can't be installed
  without admin/GUI interaction I don't have. **A hosted Supabase project is
  therefore required to do any real schema/RLS/Auth work or testing in Phase 2** —
  there's no way to meaningfully test tenant isolation without a real Postgres +
  Auth backend to test it against.
- You reinforced that `organization_id`-based tenant isolation, enforced so Company
  A can never retrieve Company B's data, is the most important part of this schema.
  Renamed every `company`/`company_id` reference across all docs and the schema to
  `organization`/`organization_id` to match your terminology exactly.

### 2026-09-08 — Phase 2 written, blocked on your Supabase project

Everything below is implemented and passes `npm run build` / `npm run lint`, but
**cannot be marked done until it runs against a real Supabase project** — per your
own rule, no phase is complete until tested, and RLS/auth can't be meaningfully
tested without a live Postgres + Auth backend.

- Scaffolded the Next.js + TypeScript app (replacing the placeholder from Phase 1
  docs-only state), Supabase client libs, Vitest, Playwright.
- `supabase/migrations/0001_init.sql` — full schema from `ARCHITECTURE.md` §4:
  `organizations`, `organization_members` (with `owner`/`admin`/`agent` roles),
  `leads` (all 9 statuses + `consent_status`/`opt_out_status`), `lead_status_history`
  (auto-populated by trigger, not app code), `conversations`, `messages`,
  `call_events`, `appointments`, `calendar_connections`, `faqs`, `ai_settings`,
  `subscriptions` (schema only). **Every tenant table has RLS enabled**, enforced
  through `is_organization_member()`/`is_organization_admin()` helper functions.
  A new organization's creator is made its `owner` automatically via trigger — there
  is no code path that creates an organization without also creating that
  membership row.
- `scripts/run-migrations.ts` — applies migrations via a direct Postgres connection
  (`npm run db:migrate`), tracked in a `_migrations` table. Doesn't depend on the
  Supabase CLI's own login flow.
- Full auth: `/signup`, `/login`, `/forgot-password`, `/update-password`,
  `/auth/confirm` (handles both signup confirmation and password-reset links),
  `/auth/error`. Signup collects a full name (stored in Supabase Auth user
  metadata — no separate `profiles` table needed yet).
- `/onboarding` — a first-login user with no organization creates one here; the
  trigger makes them its owner.
- `/dashboard` and `/dashboard/profile` — intentionally minimal placeholders that
  prove auth + organization resolution work end-to-end; the real lead dashboard is
  Phase 3's job.
- `src/proxy.ts` / `src/lib/supabase/proxy.ts` — refreshes the session on every
  request and redirects signed-out users away from protected routes. Uses
  `getClaims()`, not `getUser()`/`getSession()`, per Supabase's current guidance —
  it's the one that actually validates the JWT signature on every call.
- `src/lib/supabase/service.ts` — the service-role client for future
  webhook handlers (Phase 6), documented as bypassing RLS entirely and requiring
  hand-checked `organization_id` scoping wherever it's used.
- **Tests written, not yet run**: `tests/tenant-isolation.test.ts` — the test you
  specifically asked for: creates two real organizations, then asserts Company A
  can neither read nor write Company B's `organizations` or `leads` rows, and that
  reads/writes to its own organization work normally. `e2e/auth.spec.ts` covers
  login (with and without an existing organization), onboarding, profile updates,
  and forgot-password. One test (`tests/signup-form.test.tsx`, client-side password-
  match validation) needs no backend and already passes.
- Verified independently of Supabase: `npm run build`, `npm run lint`, and a manual
  browser check that `/`, `/signup`, `/login` render cleanly with zero console
  errors even with no Supabase credentials configured yet (the proxy and clients
  degrade gracefully rather than crashing).

### 2026-09-09 — Phase 2 tested against your real Supabase project and complete

You created the Supabase project and provided the four credentials. Two things had
to be worked around to actually connect, both now documented so they don't cost
time again:

- Your project's "Direct connection" hostname (`db.<ref>.supabase.co`) only has an
  IPv6 address — no IPv4 — which this environment can't route to. Switched
  `DATABASE_URL` to the **Session/Transaction pooler** connection string instead
  (`aws-0-us-west-2.pooler.supabase.com:6543`), which resolves over IPv4 and works
  fine for our migration script (it runs each file as one plain-SQL transaction,
  so it doesn't hit any transaction-pooler limitation around prepared statements).
- Vitest, Playwright, and the migration script each run as their own Node process
  and don't auto-load `.env.local` the way Next.js's dev server does — added
  explicit `dotenv` loading to `vitest.setup.ts`, `playwright.config.ts`, and
  `scripts/run-migrations.ts`.

Running the real tenant-isolation suite against your live database **caught an
actual bug**, exactly the kind of thing that test exists to catch: the
`on_lead_status_change` trigger from `0001_init.sql` ran `BEFORE INSERT`, but it
also writes to `lead_status_history`, which has a foreign key back to `leads.id` —
a row that doesn't exist yet at BEFORE-trigger time. Every lead insert was failing
with a foreign-key violation. Wrote `supabase/migrations/0002_fix_lead_status_trigger_timing.sql`,
which splits it into two triggers: `BEFORE UPDATE` to bump `updated_at`, and
`AFTER INSERT OR UPDATE` to write the audit-trail row once the lead genuinely
exists. Applied and re-verified.

Also found and fixed a second, more interesting RLS timing issue in the test
helper itself (not the app): chaining `.select().single()` directly onto the
`organizations` insert made Postgres evaluate the SELECT policy needed for
`RETURNING` *before* the `on_organization_created` trigger's membership insert
was visible to it — so `INSERT ... RETURNING` failed RLS even though the insert
itself was allowed. The fix is to insert without `RETURNING`, then do a separate
follow-up `SELECT` (a fresh statement, which does see the trigger's now-committed
effect). The app's actual `createOrganization` action was already written this
way by coincidence — this only affected `tests/helpers/supabase-admin.ts`.

**Final verification, all green:**
- `npm run build` — clean
- `npm run lint` — clean
- `npm run test` — 6/6 passing, including the full tenant-isolation suite:
  Company A cannot read, list, or write Company B's `organizations` or `leads`
  rows; Company A's own reads/writes work normally.
- `npm run test:e2e` — 4/4 passing: login with no organization → onboarding →
  dashboard; login with an existing organization → straight to dashboard; profile
  editing; forgot-password.

**Phase 2 is done.** Ready for Phase 3 (lead management dashboard, mock data)
whenever you want to proceed.

### 2026-09-09 — Phase 3 complete: lead management dashboard

**Interpretation call, flagged up front**: "using mock data" was written before
Phase 2's real schema existed. Built against the real, already-RLS-protected
`leads` table instead of a throwaway fake layer — "mock data" became a seed
script for realistic sample leads, not UI-only fakes that would need rebuilding.

**Designed the status-transition rules** that Phase 1's `TESTING.md` deferred to
this phase (`src/lib/lead-status.ts`): the forward pipeline (new → contacted →
engaged → qualified → appointment_booked → appointment_completed → won), `lost`
reachable from most states and re-enterable back to `contacted` (reactivating
cold leads is literally this product's stated purpose, not an edge case), and
`do_not_contact` reachable from anywhere but terminal — not casually reversible
from a dropdown, since that's a compliance flag, not a pipeline stage. Enforced
in `updateLeadStatus` (rejects invalid transitions server-side) and reflected in
the UI (`LeadStatusControl` only ever offers valid next statuses).

**Built**: leads list, lead detail (with placeholder sections for conversations/
appointments naming the phases that fill them in), add-lead form, CSV import
(dependency-free parser — this project has hit enough breaking npm packages this
session that a few dozen lines of hand-rolled RFC-4180-ish parsing beat pulling in
an unknown one), and a real dashboard overview (counts, recent leads, recent
activity pulled from `lead_status_history`). Added a shared sidebar layout for
`/dashboard/*` (Overview/Leads/Profile).

**Two real bugs found and fixed along the way, not just theoretical risk**:
1. While seeding demo data, discovered three orphaned "Playwright Roofing Co"
   organizations in the database — the `login and onboarding` e2e test creates an
   org through the real UI but its `afterAll` only ever deleted the auth user, not
   the org. Fixed the test to look up and delete the membership's organization
   too, and cleaned up the existing debris. Also hardened `scripts/seed-demo-leads.ts`
   to require an explicit `--email` or `--org-id` rather than guessing "the
   oldest organization" — which is exactly how demo data ends up seeded into
   test debris instead of a real account, as it did on the first attempt.
2. A genuine Testing-Library setup gap: `@testing-library/react`'s auto-cleanup
   between tests never registered because `vitest.config.mts` doesn't set
   `globals: true`, so renders leaked across tests within the same file. Fixed
   globally in `vitest.setup.ts` with an explicit `afterEach(cleanup)` rather than
   patching each test file.

Also found and fixed two Playwright test bugs (not app bugs): a locator
ambiguity from Next.js's accessibility route-announcer duplicating heading text,
and a race where `allTextContents()` — which doesn't auto-retry the way
`expect().toBeVisible()` does — read a `<select>` before a client-side navigation
had actually landed.

**Final verification, all green:**
- `npm run build` / `npm run lint` — clean
- `npm run test` — **24/24 passing** (was 6; added lead-status transition rules,
  CSV parsing, and the status-control component test)
- `npm run test:e2e` — **7/7 passing** (was 4; added lead creation, status
  transition, and CSV import flows). Pinned Playwright to `workers: 1` — running
  spec files in parallel against one shared dev server + Supabase project was
  contributing to flakiness.

A demo account exists for manual poking around: `demo@leadlegend.test` /
`Demo-Password-123!`, organization "Demo Roofing Co", seeded with 10 sample leads
across every status.

**Phase 3 is done.** Ready for Phase 4 (conversation system) whenever you want to
proceed.

### 2026-09-09 — Phase 4 complete: conversation system

You mentioned mixed feelings on the color/design of the UI — noted for a
dedicated pass later, not addressed in this phase.

Per the original phasing, Twilio (Phase 6) and the AI (Phase 5) don't exist yet,
so this phase built the real conversation data layer and thread UI without
pretending either is connected:

- **Sending a message is real** (persisted, threaded, ordered correctly) but not
  yet delivered as an actual text — the UI says so explicitly, so nothing here
  overstates what's connected.
- **"Simulate" is a clearly-labeled dev/test tool** (amber-highlighted, distinct
  from the real send form) standing in for a lead's reply, so the thread UI can
  be exercised before Twilio's inbound webhook exists in Phase 6.
- Each lead gets exactly one SMS conversation (`getOrCreateConversation` in
  `src/lib/conversations.ts`), backed by a **unique DB index on
  `(lead_id, channel)`** — not just app-level find-or-create — since Phase 6 will
  add a webhook path that can run concurrently with a staff action and race it.

**Extended the tenant-isolation suite** (the standing priority from Phase 2) to
cover conversations and messages: Company A cannot list Company B's
conversations or messages, cannot insert a message into Company B's
conversation, and a same-organization test proves messages come back in
chronological order.

**Verification, all green:**
- `npm run build` / `npm run lint` — clean
- `npm run test` — **27/27 passing** (was 24; +3 conversation tenant-isolation
  tests)
- `npm run test:e2e` — **10/10 passing** (was 7; +3 conversation flow tests:
  send, simulate, chronological ordering)

One test-authoring bug along the way, not an app bug: a Playwright spec reused
the same lead name across tests sharing one fixture organization, causing
ambiguous locator matches by the second test — fixed by making the name unique
per test.

**Phase 4 is done.** Ready for Phase 5 (Anthropic integration) whenever you want
to proceed — that one will need your `ANTHROPIC_API_KEY`.

### 2026-09-09 — Phase 5 complete: Anthropic integration

You provided an `ANTHROPIC_API_KEY`, which unblocked testing this for real, not
just at the unit level.

**Built:**
- `src/lib/ai/guardrails.ts` — deterministic, non-AI safety filter (pricing,
  insurance-coverage promises, legal advice, false human claims) that runs on
  every AI-drafted message before it can reach a lead. A backstop independent
  of the system prompt, per `ARCHITECTURE.md` §5.
- `src/lib/ai/system-prompt.ts` — assembled per-organization from their FAQs
  and AI settings; safety rules and escalation triggers always appended last,
  not overridable by org configuration.
- `src/lib/ai/draft-reply.ts` — calls Claude with a forced tool-use call
  (structured output: reply text + intent + qualified + wants-human), not
  free-text parsing, then runs the guardrail filter on the result.
- A minimal **Settings page** (FAQs CRUD, disclosure line, tone/instructions,
  escalation triggers) — without this the AI would have nothing real to draw
  on.
- **"Suggest with AI"** on the lead conversation — drafts into the send box for
  staff to review/edit/send. Nothing auto-sends; a human stays in the loop by
  construction. A blocked draft says so instead of silently failing.
- The AI's interest assessment shows as a **suggestion**, not an automatic
  status change — staff applies it with one click if they agree.

**On the disclosure question flagged as open back in Phase 1**: built the
configurable technical hook (on by default, overridable per-org in Settings)
as already agreed. Whether the wording is legally sufficient for your markets
is still your call, not mine — flagged again in the Settings page itself so
it doesn't get lost.

**A real bug, found by using the feature, not by writing tests for it**: the
first live test had the AI assess a lead as "qualified" after a single
exchange, but Phase 3's status state machine only allows single-step
transitions (`new → contacted → engaged → qualified`, not `new → qualified`
directly) — so "Mark as qualified" silently did nothing. Fixed by adding
`getForwardSteps()` to `src/lib/lead-status.ts`, which walks the pipeline
forward one valid step at a time to reach a target status (each step
individually valid, each one logged to `lead_status_history` by the existing
trigger) rather than weakening the transition rules themselves. The
reasoning: a lead that already replied with clear interest has, in effect,
already been "contacted" and "engaged" — those conversations happened, they
just weren't clicked through one at a time. Added 6 unit tests for this
specifically.

**Verified live, not just against unit tests**: manually walked a seeded lead
through AI-drafted opener → simulated interested reply → AI-drafted follow-up
→ "Mark as qualified" in the running app. The AI correctly identified itself
as automated, asked for lead info, offered a free estimate without ever
naming a price even when the simulated lead said "if the price is right" —
and the status genuinely jumped from New to Qualified with all three
intermediate steps correctly logged in the activity trail.

**Final verification, all green:**
- `npm run build` / `npm run lint` — clean
- `npm run test` — **62/62 passing** (was 27; +21 guardrail adversarial cases,
  +8 system-prompt tests, +6 getForwardSteps tests)
- `npm run test:e2e` — **11/11 passing** (was 10; +1 live AI drafting test
  against the real Anthropic API, auto-skipped on machines without a key)

**Phase 5 is done.** Two things on deck: the color/design pass you asked to
revisit, and Phase 6 (Twilio integration) whenever you want to proceed — that
one will need a Twilio account, phone number, and (for inbound texts) a
tunnel like ngrok.

### 2026-09-09 — Phase 6 complete: Twilio integration

You confirmed two design decisions that were blocking this phase: calls ring
the owner's cell first (only true no-answer counts as missed), and every
AI reply is human-reviewed before sending (matching Phase 5 — full autonomy
is a later decision, not this one). You provided a Twilio Account SID, Auth
Token, and phone number (`+17372324091`).

**Built:**
- Real outbound SMS, wired into the existing `sendMessage` action — with a
  **hard compliance gate** (`src/lib/compliance.ts`) checked before anything
  else: a lead marked `do_not_contact` or `opted_out` cannot receive a
  message, full stop, regardless of whether it's staff-typed or AI-drafted.
- Real inbound SMS webhook, with STOP/START keyword handling
  (`src/lib/twilio/opt-out.ts`) enforced independently of whatever Twilio's
  own carrier-level opt-out handling does or doesn't do for this account.
- Missed-call workflow: `<Dial>` rings the configured forwarding number,
  and only a genuine no-answer/busy/failed/canceled outcome (not
  "completed") creates a lead and sends the follow-up text.
- All three webhook routes verify Twilio's request signature before doing
  anything — genuinely tested by computing a valid signature with Twilio's
  own `getExpectedTwilioSignature` and confirming forged/missing signatures
  get a real 403.
- A Phone & SMS section in Settings — your tracked number, where calls
  forward to, and the exact webhook URLs to paste into the Twilio console.

**Two real, non-obvious findings from actually wiring this up against your
real account — not things I'd have caught by writing code in the abstract:**

1. **Two organizations sharing one phone number is a silent, dangerous bug,
   not just bad UX.** Inbound routing works entirely by looking up an org via
   `phone_number` — while testing, a leftover test fixture and your real
   "Demo Roofing Co" org briefly ended up configured with the same number,
   and the lookup query started failing ambiguously. Added a **database-level
   unique constraint** on `organizations.phone_number`
   (`0005_unique_organization_phone_number.sql`) so this can never happen
   silently again — each Twilio number can belong to exactly one
   organization, which is also just the correct real-world model.
2. **Twilio trial accounts can only send SMS to pre-verified recipient
   numbers.** This isn't a bug in the app — it's a hard platform restriction
   meant to prevent spam from unpaid accounts. It means **this account
   cannot yet text real, unverified customer phone numbers** — only numbers
   you've explicitly verified in the Twilio Console, or numbers reachable
   after upgrading to a paid account. Confirmed the app handles this
   gracefully (the UI shows Twilio's actual rejection message, and — because
   the compliance check and DB write both happen before the send attempt —
   nothing is ever falsely logged as delivered when it wasn't). **Before
   going live with real customers, you'll need to add a payment method to
   Twilio to lift this restriction.**

**Verification, all green:**
- `npm run build` / `npm run lint` — clean
- `npm run test` — **91/91 passing** (was 62; +20 compliance/opt-out tests,
  +9 webhook-logic integration tests against real Supabase)
- `npm run test:e2e` — **15/15 passing** (was 11; +1 Do Not Contact block
  test, +3 signature verification tests against the real HTTP routes)

**Phase 6 is done.** Two things on deck: the color/design pass you asked to
revisit, and Phase 7 (Google Calendar integration) whenever you want to
proceed.

### 2026-09-10 — Phase 7 built, pending your live OAuth connection

You provided a Google Cloud OAuth Client ID/Secret. Built and unit-tested
everything that doesn't require an actual Google login:

- **Encrypted token storage** (`src/lib/crypto.ts`) — AES-256-GCM,
  application-level per `ARCHITECTURE.md` §7's documented fallback (Supabase
  Vault would need extra setup not confirmed available on your plan). Tested:
  round-trips correctly, and tampering with stored ciphertext is detected
  rather than silently decrypting to garbage.
- **OAuth connect/callback** (`src/app/actions/calendar.ts`,
  `src/app/api/integrations/google/callback/route.ts`) — CSRF-protected via a
  short-lived state cookie, `access_type=offline` + `prompt=consent` so
  Google reliably issues a refresh token even on reconnect.
- **Booking with real conflict prevention** — checks Google's FreeBusy API
  immediately before writing the event; a genuine conflict is rejected with
  a clear message rather than silently double-booking. Date/duration
  validation extracted into a pure, unit-tested function
  (`src/lib/appointment-validation.ts`) separate from the actual conflict
  check.
- Calendar section in Settings (connect/disconnect, connection status), and
  a real booking form + appointment list on the lead detail page, replacing
  the Phase 4 placeholder.

**Why this phase can't be fully automated-tested the way Phases 2/5/6
were**: Supabase and Twilio both have admin/service APIs I could use to
create real test fixtures without a human in the loop. Google OAuth has no
equivalent — connecting a calendar requires an actual person clicking
through Google's own consent screen with a real account. So the double-
booking check against a live calendar and the token-refresh flow are
verified live with you, not via an automated test suite entry.

**Waiting on you**: connect your calendar via Settings → Connect Google
Calendar, then try booking an estimate. I'll debug from there once you
report back.

### 2026-09-10 — Phase 7 verified live and signed off

You connected your real Google account and booked a real estimate (2:55 PM,
landed on your actual Google Calendar). I then verified the double-booking
guard directly:

- Booked a second appointment at a genuinely open slot — succeeded, created
  a real Google Calendar event, and the lead's status auto-advanced to
  "Appointment booked" (`advanceLeadStatus`, added back in Phase 5 for
  exactly this kind of multi-step jump).
- Attempted a third booking at the **identical time slot** — rejected with
  "That time conflicts with something already on the calendar. Pick
  another." Confirms `hasConflict()` is really hitting Google's live
  FreeBusy API, not just checking our own `appointments` table.
- Along the way, an attempt at a slot that happened to overlap something
  already on your actual calendar (unrelated to the app) was also
  correctly rejected — further confirming the check reads real calendar
  state, not just app-created events.

**Verification, all green:**
- `npm run build` / `npm run lint` — clean
- `npm run test` — **101/101 passing**
- `npm run test:e2e` — **15/15 passing**

**Phase 7 is done.** Two things still on deck: the color/design pass you
asked to revisit (you've deferred this twice now — happy to tackle it
whenever), and Phase 8 (Analytics) whenever you want to proceed.

### 2026-09-10 — Full design pass (the color/design item, resolved)

You asked to come back to visual design before Phase 8. Audited every
screen and found the app was still running the **default Tailwind starter
theme** — flat `slate`, no accent color, and a real bug: `globals.css` hard-
coded `font-family: Arial`, silently overriding the Geist font that was
already loaded. The marketing homepage was still the literal Phase 2
placeholder ("Phase 2 build — see PROGRESS.md").

Built one real design system and applied it everywhere rather than
one-off restyling each screen:

- **Typography**: fixed the Arial bug; added Fraunces (serif display) for
  headlines paired with Geist Sans for UI text.
- **Color**: warm ink/paper neutrals (`zinc` + a custom off-white
  background) with a gold/amber accent (`--color-accent-*` tokens) —
  gives the product an identity instead of unstyled-scaffolding gray.
- **Shared primitives** in `globals.css` (`.btn-primary`, `.btn-secondary`,
  `.btn-ghost`, `.input`, `.card`, `.field-label`, status-badge dots) so
  every form/button/card across ~20 files draws from one visual language
  instead of duplicated ad hoc classes.
- **Landing page rebuilt from scratch** (`src/app/page.tsx`): real nav,
  hero with gradient glow, a 4-step flow section that mirrors your
  original product diagram (call → lead → AI text → booked estimate),
  a features grid, dark CTA band, footer.
- **Auth pages** (`src/components/AuthShell.tsx`): split-panel layout —
  dark branded left panel, form right — used by login/signup/forgot-
  password/update-password/onboarding/auth-error.
- **Dashboard shell**: dark sidebar with icon nav and an org-avatar card,
  replacing the flat white-on-white sidebar.
- **Status badges**: switched to a neutral pill + colored dot pattern
  instead of clashing pastel Tailwind defaults.
- Added `prefers-reduced-motion` handling for the new entrance animations.

This was a pure visual/markup change — no business logic, schema, or
server actions touched.

**Verification, all green:**
- `npm run build` / `npm run lint` — clean
- `npm run test` — **101/101 passing** (unchanged — no logic touched)
- `npm run test:e2e` — **15/15 passing** (confirms the redesign didn't
  break any selectors or flows)

The design item is closed — no more reminders needed. Next up: Phase 8
(Analytics) whenever you're ready.

### 2026-09-12 — Phase 8: Analytics

Added a dedicated Analytics page (`/dashboard/analytics`) built on three
pure, unit-tested metric functions in `src/lib/analytics.ts`:

- **Conversion funnel** (`computeFunnel`) — for each pipeline stage
  (new → contacted → engaged → qualified → appointment_booked →
  appointment_completed → won), counts every lead that *ever* reached that
  stage, not just leads currently sitting there. This uses
  `lead_status_history` rather than each lead's current `status`
  specifically so a lead that got qualified and later lost still counts
  toward "qualified" — a current-status-only funnel would silently drop
  it and understate real pipeline performance. Required exporting
  `FORWARD_PIPELINE` from `src/lib/lead-status.ts` (previously private) so
  the two modules share one definition of pipeline order instead of two
  copies drifting apart.
- **Lead source breakdown** (`computeSourceBreakdown`) — counts by
  `leads.source`, `null`/blank bucketed as "unknown", sorted descending.
- **Average first-response time** (`computeAvgFirstResponseMinutes`) —
  minutes between a lead's `created_at` and its first outbound message
  (joined through `conversations` → `messages`, direction = outbound).
  This is the "how fast do we actually answer a missed call" number the
  original spec's core pitch depends on. Leads with no outbound message
  yet are excluded rather than counted as an infinite wait — that
  incompleteness is already visible via the funnel's "new" count.

The "Booked rate" stat shown on the page is just the funnel's
`appointment_booked` percentage — deliberately not a separate calculation,
to avoid two definitions of the same thing drifting apart.

Also added a nav entry (`src/components/DashboardNav.tsx`, new
`ChartIcon`) and closed a pre-existing gap: `lead_status_history` had RLS
enabled since Phase 2 but wasn't covered by the tenant-isolation suite.
Since Phase 8 is the first feature to read it directly for a real
calculation (not just an activity-feed display), added two cases to
`tests/tenant-isolation.test.ts` confirming Org B can't read Org A's
status-history rows and Org A can read its own.

**Verification, all green:**
- `npm run build` / `npm run lint` — clean
- `npm run test` — **112/112 passing** (+9 for the three metric functions,
  covering the "qualified-then-lost still counts" case specifically;
  +2 for the tenant-isolation gap)
- `npm run test:e2e` — **15/15 passing** (unaffected — no existing flows
  touched)
- Manually verified end-to-end against a real seeded organization (10
  leads across a deliberate mix of pipeline depths and sources, 3 with
  outbound replies): every number on the rendered page — funnel counts/
  percentages, booked rate, source counts, avg response time — matched
  the seeded fixture exactly.

**Phase 8 is done.** Next up: Phase 9 (Stripe billing), still deferred
until you want to start charging — or Phase 10 (security review, CI,
deployment) if you'd rather harden before adding billing.

### 2026-09-12 — Phase 10: security review + regression pass done; CI/deployment blocked on git

**Security review checklist — full results in `TESTING.md`.** Headline
finding: `calendar_connections` had select/insert/update RLS policies but
**no delete policy**, so the "Disconnect" button on the Calendar section of
Settings has silently done nothing since Phase 7 — the delete call
succeeded (no error) but matched zero rows under RLS, and the UI still
showed "Connected" afterward. Fixed with
`supabase/migrations/0007_calendar_connections_delete_policy.sql`, applied
to your Supabase project, and proved with a new test
(`tests/tenant-isolation.test.ts`) that an org can now disconnect its own
calendar while still being unable to touch another org's.

While auditing, extended tenant-isolation coverage to every remaining
tenant-owned table that didn't have it yet: `appointments`,
`calendar_connections`, `faqs`, `ai_settings`, `call_events`,
`organization_members`, `subscriptions`. All 12 tenant-owned tables now
have a policy **and** a test proving it, not just a policy that's assumed
to work.

Other findings, all fixed:
- Webhook signature failures (forged/missing Twilio signatures) were never
  logged — a genuine gap against REQUIREMENTS.md §11's "log webhook
  signature failures" requirement. Added a `console.error` in
  `src/lib/twilio/webhook-request.ts`.
- `.gitignore`'s `.env*` pattern was silently excluding
  `.env.local.example` — the setup-doc file that's supposed to be
  committed — from ever being tracked. Narrowed to `.env`/`.env.local`/
  `.env.*.local` so the example file is committable once there's a repo.
- A dead `/reset-password` entry in the proxy's public-path allowlist
  (`src/lib/supabase/proxy.ts`) — that route was never built; the real one
  is `/forgot-password`, already listed. Removed.
- No secret is reachable from the client bundle (grepped a fresh
  `.next/static` for every server secret's actual value — none found) and
  `npm audit` reports 0 vulnerabilities.

**Full regression pass**: `npm run build`/`lint` clean, **120/120** unit
tests (was 112 — +8 new tenant-isolation cases), **15/15** e2e, all green
after every fix above.

**CI**: wrote `.github/workflows/ci.yml` — lint, build, unit tests, and e2e
on every push/PR. **Not running yet**: this machine can't execute `git`
(Xcode Command Line Tools were never installed here — the same constraint
noted back in Phase 1's environment setup), so there's no repo to push and
nothing for GitHub Actions to trigger against.

**Deployment**: wrote a full Vercel deployment section in `README.md`
(env vars, `PUBLIC_APP_URL`, webhook/OAuth redirect updates, running
migrations against production, smoke-test steps) but haven't actually
deployed — that needs the same git repo plus your Vercel account login,
which I can't do on your behalf.

**What's genuinely done in Phase 10**: security review, regression pass,
CI workflow authored, deployment fully documented. **What's blocked on
you**: getting `git` working here (installing Xcode Command Line Tools
needs your password, so I can't run that fix myself) or telling me you'll
push this repo and deploy from your own machine instead — either way, I'll
pick the CI/deployment verification back up once there's a repo to work
with.

### 2026-09-20 — CI is live and green

You installed the Command Line Tools, and we got `git` working, initialized
the repo, and pushed it to `github.com/johnlmolina/lead-legend` (private) —
authenticated via a new SSH key generated on this machine, since there was
no existing git/GitHub credential here at all. GitHub Actions started
running `.github/workflows/ci.yml` automatically on push, once you added
the 11 required/optional secrets under Settings → Secrets and variables →
Actions.

First run failed with `JWT issued at future` from Supabase on
`tests/twilio-webhooks.test.ts` — a real but transient clock-skew rejection
that happens when a fresh CI runner VM's clock hasn't fully finished NTP
sync the instant a just-issued auth token is first used. Never reproduced
locally. Fixed by retrying the one query that hit it
(`tests/helpers/supabase-admin.ts`'s `createTestOrganization`) up to 3
times with a short delay on that specific error — real time passing clears
the skew, a new token wouldn't. Verified locally (120/120 unit tests, lint
clean) and pushed; the next CI run went green.

**CI is done: lint, build, unit tests, and e2e now run automatically on
every push to `main` and every PR, against your real Supabase project.**

Remaining in Phase 10: actual deployment (Vercel). Fully documented in
`README.md`'s Deployment section; walking through it live next since it
needs your Vercel account.

### 2026-10-06 — Deployed to Vercel; live smoke test found a missed-call bug

Deployed to `https://lead-legend-2jfm.vercel.app` (Vercel, same Supabase
project as local dev). Things that came up along the way:

- **The original Twilio number was lost.** After upgrading the trial account
  to a full one, `+17372324091` no longer existed on the account (confirmed
  via the Twilio API: active/Full account, zero owned numbers, no
  subaccounts). Bought a new number, `+12144417876`, and swapped it into
  `.env.local`, Vercel, the GitHub Actions secret, the org's Settings
  page, and the Twilio webhooks (voice + SMS pointing at the live URL).
- **Supabase had auto-paused the project** (free tier, inactivity) — the host
  stopped resolving and the live app couldn't log in. Restored from the
  dashboard; no data lost. Worth knowing: this will happen again if the
  project sits idle for about a week.
- The demo login (`demo@leadlegend.test`) was created by Claude on
  2026-09-10 for local testing with a weak throwaway password; it should be
  changed (via `/update-password`) now that the site is public.
- **Bug found by the live smoke test**: a missed call created the lead and
  texted the caller, but the automated follow-up text was never saved to the
  lead's conversation, so the dashboard showed an empty thread. Fixed in
  `src/lib/twilio/missed-call.ts` (now records the message, with the
  Twilio SID). The matching test previously tolerated only Twilio's
  *trial-account* send error and broke once the account was upgraded; it
  now mocks only the outbound send (real database otherwise) and asserts
  the text is recorded. 120/120 unit tests, lint and build clean.
- Texts from the new number are currently rejected by carriers (Twilio
  error 30034, "unregistered number") until A2P 10DLC registration is
  completed — a Twilio/carrier requirement, not an app issue.
