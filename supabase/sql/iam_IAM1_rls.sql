-- IAM-1 RLS policies for identity tables
set check_function_bodies = off;

-- Organizations
alter table public.organizations enable row level security;

drop policy if exists organization_system_admin_select on public.organizations;
create policy organization_system_admin_select on public.organizations
  for select using (public.is_system_admin(auth.uid()));

drop policy if exists organization_member_select on public.organizations;
create policy organization_member_select on public.organizations
  for select using (public.is_member_of(id));

drop policy if exists organization_system_admin_insert on public.organizations;
create policy organization_system_admin_insert on public.organizations
  for insert with check (public.is_system_admin(auth.uid()));

drop policy if exists organization_system_admin_update on public.organizations;
create policy organization_system_admin_update on public.organizations
  for update using (public.is_system_admin(auth.uid())) with check (public.is_system_admin(auth.uid()));

drop policy if exists organization_system_admin_delete on public.organizations;
create policy organization_system_admin_delete on public.organizations
  for delete using (public.is_system_admin(auth.uid()));

-- Teams
alter table public.teams enable row level security;

drop policy if exists teams_member_select on public.teams;
create policy teams_member_select on public.teams
  for select using (public.is_member_of(org_id));

drop policy if exists teams_employee_insert on public.teams;
create policy teams_employee_insert on public.teams
  for insert with check (public.has_min_role(org_id, 'EMPLOYEE'));

drop policy if exists teams_manager_update on public.teams;
create policy teams_manager_update on public.teams
  for update using (public.has_min_role(org_id, 'MANAGER')) with check (public.has_min_role(org_id, 'MANAGER'));

-- User profiles (self only)
alter table public.user_profiles enable row level security;

drop policy if exists user_profiles_self_select on public.user_profiles;
create policy user_profiles_self_select on public.user_profiles
  for select using (id = auth.uid());

drop policy if exists user_profiles_self_update on public.user_profiles;
create policy user_profiles_self_update on public.user_profiles
  for update using (id = auth.uid()) with check (id = auth.uid());

-- Memberships
alter table public.memberships enable row level security;

drop policy if exists memberships_member_select on public.memberships;
create policy memberships_member_select on public.memberships
  for select using (public.is_member_of(org_id));

drop policy if exists memberships_manager_insert on public.memberships;
create policy memberships_manager_insert on public.memberships
  for insert with check (public.has_min_role(org_id, 'MANAGER'));

drop policy if exists memberships_manager_update on public.memberships;
create policy memberships_manager_update on public.memberships
  for update using (public.has_min_role(org_id, 'MANAGER')) with check (public.has_min_role(org_id, 'MANAGER'));

-- Team memberships
alter table public.team_memberships enable row level security;

drop policy if exists team_memberships_member_select on public.team_memberships;
create policy team_memberships_member_select on public.team_memberships
  for select using (
    exists(
      select 1
      from public.teams t
      where t.id = public.team_memberships.team_id
        and public.is_member_of(t.org_id)
    )
  );

drop policy if exists team_memberships_employee_insert on public.team_memberships;
create policy team_memberships_employee_insert on public.team_memberships
  for insert with check (
    exists(
      select 1
      from public.teams t
      where t.id = public.team_memberships.team_id
        and public.has_min_role(t.org_id, 'EMPLOYEE')
    )
  );

drop policy if exists team_memberships_manager_update on public.team_memberships;
create policy team_memberships_manager_update on public.team_memberships
  for update using (
    exists(
      select 1
      from public.teams t
      where t.id = public.team_memberships.team_id
        and public.has_min_role(t.org_id, 'MANAGER')
    )
  )
  with check (
    exists(
      select 1
      from public.teams t
      where t.id = public.team_memberships.team_id
        and public.has_min_role(t.org_id, 'MANAGER')
    )
  );

-- Invites
alter table public.invites enable row level security;

drop policy if exists invites_member_select on public.invites;
create policy invites_member_select on public.invites
  for select using (public.is_member_of(org_id));

drop policy if exists invites_manager_insert on public.invites;
create policy invites_manager_insert on public.invites
  for insert with check (public.has_min_role(org_id, 'MANAGER'));

drop policy if exists invites_manager_update on public.invites;
create policy invites_manager_update on public.invites
  for update using (public.has_min_role(org_id, 'MANAGER')) with check (public.has_min_role(org_id, 'MANAGER'));

-- User preferences
alter table public.user_preferences enable row level security;

drop policy if exists user_preferences_self_select on public.user_preferences;
create policy user_preferences_self_select on public.user_preferences
  for select using (user_id = auth.uid());

drop policy if exists user_preferences_self_update on public.user_preferences;
create policy user_preferences_self_update on public.user_preferences
  for update using (user_id = auth.uid()) with check (user_id = auth.uid());
