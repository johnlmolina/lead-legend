-- Lead Legend — Phase 2 initial schema
-- Every tenant-owned table carries organization_id and has RLS enabled with a
-- policy that checks organization membership. See ARCHITECTURE.md §3-4.

create extension if not exists pgcrypto;

-- =========================================================================
-- ORGANIZATIONS & MEMBERSHIP
-- =========================================================================

create table organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  phone_number text,
  business_hours jsonb,
  service_area text,
  services_offered text[] not null default '{}',
  created_at timestamptz not null default now()
);

create type organization_role as enum ('owner', 'admin', 'agent');

create table organization_members (
  user_id uuid not null references auth.users (id) on delete cascade,
  organization_id uuid not null references organizations (id) on delete cascade,
  role organization_role not null default 'agent',
  created_at timestamptz not null default now(),
  primary key (user_id, organization_id)
);

create index organization_members_organization_id_idx on organization_members (organization_id);

-- Helper functions used inside RLS policies below. security definer so they
-- can read organization_members without recursing into its own RLS policy.
create or replace function is_organization_member(target_organization_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from organization_members
    where organization_id = target_organization_id
      and user_id = auth.uid()
  );
$$;

create or replace function is_organization_admin(target_organization_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from organization_members
    where organization_id = target_organization_id
      and user_id = auth.uid()
      and role in ('owner', 'admin')
  );
$$;

-- A brand-new user has no membership yet, so they can't satisfy
-- is_organization_member() to insert their own first org via a normal RLS
-- check. Instead: any authenticated user may create an organization row, and
-- this trigger atomically makes them its owner. There is deliberately no
-- insert policy on organization_members for the authenticated role — the
-- only way a membership row is created is through this trigger (running as
-- the function owner, bypassing RLS) or a future admin-invite RPC we'll add
-- when the product needs it.
create or replace function handle_new_organization()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into organization_members (user_id, organization_id, role)
  values (auth.uid(), new.id, 'owner');
  return new;
end;
$$;

create trigger on_organization_created
  after insert on organizations
  for each row execute function handle_new_organization();

alter table organizations enable row level security;
alter table organization_members enable row level security;

create policy "Members can view their organization"
  on organizations for select
  using (is_organization_member(id));

create policy "Any authenticated user can create an organization"
  on organizations for insert
  with check (auth.uid() is not null);

create policy "Admins can update their organization"
  on organizations for update
  using (is_organization_admin(id));

create policy "Members can view fellow members of their organization"
  on organization_members for select
  using (is_organization_member(organization_id));

-- =========================================================================
-- LEADS
-- =========================================================================

create type lead_status as enum (
  'new',
  'contacted',
  'engaged',
  'qualified',
  'appointment_booked',
  'appointment_completed',
  'won',
  'lost',
  'do_not_contact'
);

create type consent_status as enum ('unknown', 'granted', 'declined');
create type opt_out_status as enum ('subscribed', 'opted_out');

create table leads (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations (id) on delete cascade,
  name text,
  phone text not null,
  email text,
  address text,
  source text,
  status lead_status not null default 'new',
  consent_status consent_status not null default 'unknown',
  opt_out_status opt_out_status not null default 'subscribed',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index leads_organization_id_idx on leads (organization_id);
create index leads_organization_id_phone_idx on leads (organization_id, phone);

create table lead_status_history (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid not null references leads (id) on delete cascade,
  organization_id uuid not null references organizations (id) on delete cascade,
  from_status lead_status,
  to_status lead_status not null,
  changed_by uuid references auth.users (id),
  changed_at timestamptz not null default now()
);

create index lead_status_history_organization_id_idx on lead_status_history (organization_id);
create index lead_status_history_lead_id_idx on lead_status_history (lead_id);

-- The audit trail is written by a trigger, not app code, so it can never be
-- forgotten and always matches what's actually in the leads table.
create or replace function record_lead_status_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if (tg_op = 'INSERT') or (old.status is distinct from new.status) then
    insert into lead_status_history (lead_id, organization_id, from_status, to_status, changed_by)
    values (
      new.id,
      new.organization_id,
      case when tg_op = 'INSERT' then null else old.status end,
      new.status,
      auth.uid()
    );
  end if;
  new.updated_at = now();
  return new;
end;
$$;

create trigger on_lead_status_change
  before insert or update on leads
  for each row execute function record_lead_status_change();

alter table leads enable row level security;
alter table lead_status_history enable row level security;

create policy "Members can view their organization's leads"
  on leads for select
  using (is_organization_member(organization_id));

create policy "Members can create leads for their organization"
  on leads for insert
  with check (is_organization_member(organization_id));

create policy "Members can update their organization's leads"
  on leads for update
  using (is_organization_member(organization_id));

create policy "Members can view their organization's lead history"
  on lead_status_history for select
  using (is_organization_member(organization_id));

-- =========================================================================
-- CONVERSATIONS & MESSAGES
-- =========================================================================

create type conversation_channel as enum ('sms');

create table conversations (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid not null references leads (id) on delete cascade,
  organization_id uuid not null references organizations (id) on delete cascade,
  channel conversation_channel not null default 'sms',
  created_at timestamptz not null default now()
);

create index conversations_organization_id_idx on conversations (organization_id);
create index conversations_lead_id_idx on conversations (lead_id);

create type message_direction as enum ('inbound', 'outbound');
create type message_sender as enum ('lead', 'ai', 'human');

create table messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references conversations (id) on delete cascade,
  organization_id uuid not null references organizations (id) on delete cascade,
  direction message_direction not null,
  sender message_sender not null,
  body text not null,
  twilio_sid text,
  created_at timestamptz not null default now()
);

create index messages_organization_id_idx on messages (organization_id);
create index messages_conversation_id_created_at_idx on messages (conversation_id, created_at);

alter table conversations enable row level security;
alter table messages enable row level security;

create policy "Members can view their organization's conversations"
  on conversations for select
  using (is_organization_member(organization_id));

create policy "Members can create conversations for their organization"
  on conversations for insert
  with check (is_organization_member(organization_id));

create policy "Members can view their organization's messages"
  on messages for select
  using (is_organization_member(organization_id));

create policy "Members can send messages for their organization"
  on messages for insert
  with check (is_organization_member(organization_id));

-- =========================================================================
-- CALL EVENTS (missed-call workflow)
-- =========================================================================

create type call_event_status as enum ('no-answer', 'busy', 'completed', 'failed');

create table call_events (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations (id) on delete cascade,
  lead_id uuid references leads (id) on delete set null,
  twilio_call_sid text,
  status call_event_status not null,
  occurred_at timestamptz not null default now()
);

create index call_events_organization_id_idx on call_events (organization_id);

alter table call_events enable row level security;

create policy "Members can view their organization's call events"
  on call_events for select
  using (is_organization_member(organization_id));

-- =========================================================================
-- APPOINTMENTS & CALENDAR
-- =========================================================================

create type appointment_status as enum ('scheduled', 'completed', 'canceled');

create table appointments (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid not null references leads (id) on delete cascade,
  organization_id uuid not null references organizations (id) on delete cascade,
  google_event_id text,
  scheduled_at timestamptz not null,
  status appointment_status not null default 'scheduled',
  created_at timestamptz not null default now()
);

create index appointments_organization_id_idx on appointments (organization_id);
create index appointments_organization_id_scheduled_at_idx on appointments (organization_id, scheduled_at);

create table calendar_connections (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null unique references organizations (id) on delete cascade,
  google_refresh_token_encrypted text,
  calendar_id text,
  connected_at timestamptz
);

alter table appointments enable row level security;
alter table calendar_connections enable row level security;

create policy "Members can view their organization's appointments"
  on appointments for select
  using (is_organization_member(organization_id));

create policy "Members can manage their organization's appointments"
  on appointments for insert
  with check (is_organization_member(organization_id));

create policy "Members can update their organization's appointments"
  on appointments for update
  using (is_organization_member(organization_id));

create policy "Admins can view their organization's calendar connection"
  on calendar_connections for select
  using (is_organization_admin(organization_id));

create policy "Admins can manage their organization's calendar connection"
  on calendar_connections for insert
  with check (is_organization_admin(organization_id));

create policy "Admins can update their organization's calendar connection"
  on calendar_connections for update
  using (is_organization_admin(organization_id));

-- =========================================================================
-- SETTINGS: FAQs & AI behavior
-- =========================================================================

create table faqs (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations (id) on delete cascade,
  question text not null,
  answer text not null,
  created_at timestamptz not null default now()
);

create index faqs_organization_id_idx on faqs (organization_id);

create table ai_settings (
  organization_id uuid primary key references organizations (id) on delete cascade,
  persona jsonb not null default '{}'::jsonb,
  escalation_triggers text[] not null default '{}',
  disclosure_line text,
  updated_at timestamptz not null default now()
);

alter table faqs enable row level security;
alter table ai_settings enable row level security;

create policy "Members can view their organization's FAQs"
  on faqs for select
  using (is_organization_member(organization_id));

create policy "Admins can manage their organization's FAQs"
  on faqs for insert
  with check (is_organization_admin(organization_id));

create policy "Admins can update their organization's FAQs"
  on faqs for update
  using (is_organization_admin(organization_id));

create policy "Admins can delete their organization's FAQs"
  on faqs for delete
  using (is_organization_admin(organization_id));

create policy "Members can view their organization's AI settings"
  on ai_settings for select
  using (is_organization_member(organization_id));

create policy "Admins can manage their organization's AI settings"
  on ai_settings for insert
  with check (is_organization_admin(organization_id));

create policy "Admins can update their organization's AI settings"
  on ai_settings for update
  using (is_organization_admin(organization_id));

-- =========================================================================
-- BILLING (schema only — Phase 9 implements usage; see REQUIREMENTS.md §10)
-- =========================================================================

create type subscription_plan as enum ('starter', 'professional', 'agency');
create type subscription_status as enum ('active', 'past_due', 'canceled', 'trialing');

create table subscriptions (
  organization_id uuid primary key references organizations (id) on delete cascade,
  stripe_customer_id text,
  stripe_subscription_id text,
  plan subscription_plan,
  status subscription_status,
  updated_at timestamptz not null default now()
);

alter table subscriptions enable row level security;

create policy "Admins can view their organization's subscription"
  on subscriptions for select
  using (is_organization_admin(organization_id));
