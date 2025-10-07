-- IAM-4 RLS policies for impersonation grants
set check_function_bodies = off;

alter table public.impersonation_grants enable row level security;

drop policy if exists impersonation_view on public.impersonation_grants;
create policy impersonation_view on public.impersonation_grants
  for select using (
    public.is_member_of(org_id)
  );

drop policy if exists impersonation_insert on public.impersonation_grants;
create policy impersonation_insert on public.impersonation_grants
  for insert with check (
    public.has_min_role(org_id, 'MANAGER')
  );

drop policy if exists impersonation_update on public.impersonation_grants;
create policy impersonation_update on public.impersonation_grants
  for update using (
    public.has_min_role(org_id, 'MANAGER')
  ) with check (
    public.has_min_role(org_id, 'MANAGER')
  );
