-- Audit PBC1 row-level security policies for PBC manager tables

alter table public.pbc_requests enable row level security;

create policy pbc_requests_select on public.pbc_requests
  for select using (public.is_member_of(org_id));

create policy pbc_requests_insert on public.pbc_requests
  for insert with check (public.has_min_role(org_id, 'EMPLOYEE'));

create policy pbc_requests_update on public.pbc_requests
  for update using (public.has_min_role(org_id, 'EMPLOYEE'))
  with check (public.has_min_role(org_id, 'EMPLOYEE'));

create policy pbc_requests_delete on public.pbc_requests
  for delete using (public.has_min_role(org_id, 'MANAGER'));

alter table public.pbc_deliveries enable row level security;

create policy pbc_deliveries_select on public.pbc_deliveries
  for select using (public.is_member_of(org_id));

create policy pbc_deliveries_insert on public.pbc_deliveries
  for insert with check (public.has_min_role(org_id, 'EMPLOYEE'));

create policy pbc_deliveries_update on public.pbc_deliveries
  for update using (public.has_min_role(org_id, 'EMPLOYEE'))
  with check (public.has_min_role(org_id, 'EMPLOYEE'));

create policy pbc_deliveries_delete on public.pbc_deliveries
  for delete using (public.has_min_role(org_id, 'MANAGER'));
