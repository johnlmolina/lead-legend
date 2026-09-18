-- calendar_connections had select/insert/update policies but no delete
-- policy, so disconnectGoogleCalendar()'s delete() silently affected zero
-- rows under RLS for every user — the "Disconnect" button in Settings has
-- never actually worked. Found during the Phase 10 security/RLS audit.

create policy "Admins can delete their organization's calendar connection"
  on calendar_connections for delete
  using (is_organization_admin(organization_id));
