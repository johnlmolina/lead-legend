-- Fix: 0001's on_lead_status_change trigger ran BEFORE INSERT so it could set
-- updated_at, but it also inserts into lead_status_history referencing
-- leads(id) via a foreign key — that row doesn't exist yet at BEFORE-trigger
-- time, so every insert failed with a foreign key violation. Caught by
-- tests/tenant-isolation.test.ts.
--
-- Fix: split into two triggers with the timing each part actually needs —
-- BEFORE UPDATE to bump updated_at (INSERT already gets it from the column
-- default), AFTER INSERT OR UPDATE to write the audit trail, once the row
-- genuinely exists.

drop trigger if exists on_lead_status_change on leads;
drop function if exists record_lead_status_change();

create or replace function set_lead_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger on_lead_updated
  before update on leads
  for each row execute function set_lead_updated_at();

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
  return new;
end;
$$;

create trigger on_lead_status_change
  after insert or update on leads
  for each row execute function record_lead_status_change();
