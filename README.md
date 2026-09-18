# Lead Legend

A multi-tenant SaaS for residential roofing organizations: recover missed calls, follow
up on new and existing leads, and convert more leads into booked roof
inspections/estimates.

## Status

**Phase 8 of 10 complete — Analytics.** Phase 10 (security review, CI,
deployment, docs) is in progress. See `PROGRESS.md` for the full phase
checklist and log.

## Documents

- [`REQUIREMENTS.md`](./REQUIREMENTS.md) — what's being built, organized by feature
  area, with open questions flagged.
- [`ARCHITECTURE.md`](./ARCHITECTURE.md) — proposed technical architecture, data
  model, tenant-isolation strategy, and risks/dependencies.
- [`TESTING.md`](./TESTING.md) — testing strategy and the per-phase exit criteria
  that gate moving forward.
- [`PROGRESS.md`](./PROGRESS.md) — living status log, updated every phase.

## Stack

Next.js (App Router) + TypeScript, PostgreSQL via Supabase, Supabase Auth, Anthropic
API, Twilio, Google Calendar API, Stripe (deferred), deployed on Vercel. Full
rationale in `ARCHITECTURE.md`.

## Running locally

```bash
cd "/Users/johnmolina/Claude/SaaS Lead Finder"
npm install
cp .env.local.example .env.local   # then fill in your Supabase credentials
npm run db:migrate                 # applies supabase/migrations/*.sql
npm run dev
```

Seed some sample leads to look at (requires an account that's completed onboarding):

```bash
npm run db:seed -- --email=you@example.com
```

Testing:

```bash
npm run test         # Vitest — includes tests/tenant-isolation.test.ts
npm run test:e2e     # Playwright — needs `npm run dev` running separately, or
                      # let Playwright's webServer start it for you
```

## Twilio setup notes

- Each organization's tracked number is set in **Settings → Phone & SMS** (not
  just `.env`) — that's the DB value the app actually routes by, and it's
  enforced unique across organizations.
- **Trial accounts can only send SMS to pre-verified recipient numbers** —
  this is a Twilio platform restriction, not a bug. You won't be able to text
  real, unverified customer numbers until you add a payment method (or verify
  specific test numbers in the Twilio Console) — see `PROGRESS.md`'s Phase 6
  entry for the full explanation.
- Inbound texts and the missed-call `<Dial>` status callback need Twilio to
  reach this app over the public internet — set `PUBLIC_APP_URL` to a tunnel
  URL (e.g. `ngrok http 3000`) and point your Twilio number's webhooks at the
  URLs shown on the Settings page. Outbound sending works without this.

## Continuous integration

`.github/workflows/ci.yml` runs lint, build, the unit/integration suite, and
the e2e suite on every push and PR — once this project is pushed to GitHub.
The unit and e2e suites hit a **real Supabase project** (see
`tests/helpers/supabase-admin.ts`), so CI needs the same secrets `.env.local`
needs, added under the repo's **Settings → Secrets and variables → Actions**.
Point them at a dedicated test Supabase project if you can — the suite
creates and deletes real organizations/users on every run.

## Deployment (Vercel)

1. Push this repository to GitHub (or GitLab/Bitbucket).
2. In Vercel, "Add New Project" → import the repo. Vercel auto-detects
   Next.js; no build-command changes needed.
3. Add every variable from `.env.local` to the Vercel project's Environment
   Variables (Production **and** Preview) — `TOKEN_ENCRYPTION_KEY` especially
   must be identical to whatever value was used locally if any organization
   already connected a Google Calendar, since it decrypts stored refresh
   tokens.
4. Set `PUBLIC_APP_URL` to the deployed domain (e.g.
   `https://your-app.vercel.app`) and update the Twilio webhook URLs and the
   Google Cloud OAuth redirect URI to point at it instead of a local tunnel.
5. Run `npm run db:migrate` once against the **production** `DATABASE_URL`
   before or right after the first deploy — Vercel doesn't run this for you.
6. Smoke test against the live URL: sign up, create an organization, add a
   lead, send a message, and (if Twilio/Google are configured) confirm a
   real inbound webhook and a real calendar booking both work end to end —
   the same checks as the Phase 6/7 live-verification steps in
   `PROGRESS.md`, just against the deployed domain instead of localhost.

## Prior work

An earlier prototype ("LeadPilot" — a generic home-services lead tool on a
different stack: Next.js + SQLite + custom auth) was built before this project was
scoped, and is preserved as-is at [`archive/leadpilot-prototype/`](./archive/leadpilot-prototype/)
for reference. It is not part of Lead Legend and won't be built on further.
