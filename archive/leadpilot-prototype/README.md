# LeadPilot

A working prototype of a lead-conversion SaaS for home services & contractor businesses:
CRM / AI chat / SMS all feed a shared lead database, an AI responder and phone follow-up
work each lead, and qualified leads get booked straight onto a calendar as estimates.

This is a **prototype**. CRM and Calendar are still simulated in-app. **AI replies
(Claude) and SMS (Twilio) are wired to the real APIs** — see "Real integrations" below
to turn them on. The one-click "Simulate a new lead" button always works with zero
API keys (it never calls a real provider), so the product stays demoable either way.

## Stack

- Next.js 16 (App Router) + TypeScript
- Tailwind CSS v4
- Prisma 6 + SQLite (`prisma/dev.db`)
- Custom session auth (bcryptjs + signed JWT cookie via `jose`) — see `src/lib/session.ts`

Next.js 16 renamed `middleware.ts` to `proxy.ts` (used here for route protection) and
introduced the `PageProps<'/route'>` / `LayoutProps<'/route'>` typed-route helpers —
both are used throughout this codebase.

## Running locally

This machine had no Node.js installed, so a standalone copy was placed at `~/.local/node`
and symlinked into `~/.local/bin` (added to your `PATH` in `~/.zshrc`/`~/.zprofile`).
Open a **new terminal window** (so the updated PATH loads), then:

```bash
cd "/Users/johnmolina/Claude/SaaS Lead Finder"
npm install
npm run dev
```

Visit http://localhost:3000, sign up for an account, and click **"Simulate a new lead"**
on the dashboard to watch a lead move through the whole pipeline (AI/SMS reply → phone
call logged → estimate booked on the calendar).

## Project structure

- `src/app/page.tsx` — marketing landing page
- `src/app/login`, `src/app/signup` — auth pages
- `src/app/dashboard/*` — the app (overview, leads, calendar, integrations, settings)
- `src/app/actions/*` — server actions (auth, lead pipeline, integrations)
- `src/lib/session.ts`, `src/lib/dal.ts` — session/auth plumbing
- `src/lib/simulate.ts` — the "AI"/demo-data generator that stands in for real
  CRM/SMS/AI/phone providers
- `prisma/schema.prisma` — data model (User, Lead, Message, CallLog, Appointment,
  Integration)

## Real integrations

### AI replies (Claude)

1. Get an API key at https://console.anthropic.com/settings/keys (requires adding
   billing — separate from a claude.ai subscription).
2. Put it in `.env`: `ANTHROPIC_API_KEY=sk-ant-...`
3. Restart `npm run dev`. The `/dashboard/integrations` page will show "API keys
   detected" for AI, and the **"Suggest with AI"** button on a lead's reply box will
   draft real replies from the conversation history (`src/lib/ai.ts`).

### SMS (Twilio)

1. Create a Twilio account at https://www.twilio.com/try-twilio and get a phone
   number capable of SMS (the trial gives you one free number).
2. From the Twilio Console, copy your **Account SID** and **Auth Token**.
3. Put them in `.env`:
   ```
   TWILIO_ACCOUNT_SID=AC...
   TWILIO_AUTH_TOKEN=...
   TWILIO_PHONE_NUMBER=+1XXXXXXXXXX
   ```
4. Restart `npm run dev`, go to `/dashboard/integrations`, click **Connect** on the
   SMS card, and enter that same Twilio number in the field that appears (this is
   what routes an inbound text to your account).
5. Outbound now works immediately: replying to an SMS lead (or using "Suggest with
   AI" + Send) sends a real text via `src/lib/sms.ts`.
6. **Inbound** (a lead texting back) requires Twilio to reach your machine, which
   means a public URL:
   - Run a tunnel, e.g. `ngrok http 3000`, and copy the `https://...ngrok-free.app`
     URL it gives you.
   - Set `PUBLIC_APP_URL=https://your-tunnel-url` in `.env` and restart the server.
   - In the Twilio Console, open your phone number's settings and set "A message
     comes in" to `https://your-tunnel-url/api/webhooks/twilio/sms` (POST).
   - The webhook (`src/app/api/webhooks/twilio/sms/route.ts`) verifies Twilio's
     signature, saves the inbound message, and — if `ANTHROPIC_API_KEY` is set —
     automatically drafts and sends an AI reply.

Both integrations fail gracefully without keys: the UI shows an inline message
("...isn't configured yet") instead of erroring, and outbound sends are simply
skipped while still recording the message locally.

## Going to production

The remaining integrations to replace:

1. **Phone** — swap the simulated call log for a real AI-voice or call-tracking
   provider.
2. **Calendar** — push `Appointment` records to a real calendar (Google Calendar,
   Cal.com, etc.) instead of just storing them locally.
3. **CRM sync** — pull leads from an existing CRM into the `Lead` table on a schedule
   or via webhook.
4. **Database** — move off SQLite to Postgres for production (Prisma makes this a
   one-line `datasource` change).
5. **Auth** — the custom session implementation is functional but minimal; consider
   an auth library (Clerk, Auth.js, etc.) if you need SSO, MFA, or team accounts.
6. **Multi-tenant SMS** — this prototype uses one shared Twilio account (from `.env`)
   with a per-user "your number" field for inbound routing. A real multi-tenant
   product would give each business its own Twilio subaccount.

The CRM and Calendar cards on `/dashboard/integrations` are the natural home for
real "Connect" OAuth flows once you build them.
