-- RLS policies for TCWG packs and engagement archives

alter table public.engagement_archives enable row level security;

create policy engagement_archives_select on public.engagement_archives
  for select using (public.is_member_of(org_id));

create policy engagement_archives_write on public.engagement_archives
  for insert with check (public.has_min_role(org_id, 'MANAGER'));

create policy engagement_archives_update on public.engagement_archives
  for update using (public.has_min_role(org_id, 'MANAGER'))
  with check (public.has_min_role(org_id, 'MANAGER'));

create policy engagement_archives_delete on public.engagement_archives
  for delete using (public.has_min_role(org_id, 'MANAGER'));

alter table public.tcwg_packs enable row level security;

create policy tcwg_packs_select on public.tcwg_packs
  for select using (public.is_member_of(org_id));

create policy tcwg_packs_insert on public.tcwg_packs
  for insert with check (public.has_min_role(org_id, 'EMPLOYEE'));

create policy tcwg_packs_update on public.tcwg_packs
  for update using (public.has_min_role(org_id, 'EMPLOYEE'))
  with check (public.has_min_role(org_id, 'EMPLOYEE'));

create policy tcwg_packs_delete on public.tcwg_packs
  for delete using (public.has_min_role(org_id, 'MANAGER'));
