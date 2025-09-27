-- RLS policies for client acceptance & independence tables

alter table public.client_background_checks enable row level security;

create policy background_checks_select on public.client_background_checks
  for select using (public.is_member_of(org_id));

create policy background_checks_write on public.client_background_checks
  for insert with check (public.has_min_role(org_id, 'EMPLOYEE'));

create policy background_checks_update on public.client_background_checks
  for update using (public.has_min_role(org_id, 'EMPLOYEE'))
  with check (public.has_min_role(org_id, 'EMPLOYEE'));

alter table public.independence_assessments enable row level security;

create policy independence_select on public.independence_assessments
  for select using (public.is_member_of(org_id));

create policy independence_write on public.independence_assessments
  for insert with check (public.has_min_role(org_id, 'EMPLOYEE'));

create policy independence_update on public.independence_assessments
  for update using (public.has_min_role(org_id, 'EMPLOYEE'))
  with check (public.has_min_role(org_id, 'EMPLOYEE'));

alter table public.acceptance_decisions enable row level security;

create policy acceptance_select on public.acceptance_decisions
  for select using (public.is_member_of(org_id));

create policy acceptance_insert on public.acceptance_decisions
  for insert with check (public.has_min_role(org_id, 'EMPLOYEE'));

create policy acceptance_update on public.acceptance_decisions
  for update using (public.has_min_role(org_id, 'EMPLOYEE'))
  with check (public.has_min_role(org_id, 'EMPLOYEE'));

create policy acceptance_delete on public.acceptance_decisions
  for delete using (public.has_min_role(org_id, 'MANAGER'));
