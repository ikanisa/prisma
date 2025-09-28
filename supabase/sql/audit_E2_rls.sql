-- RLS policies for audit report drafts

alter table public.audit_report_drafts enable row level security;

create policy audit_report_drafts_select on public.audit_report_drafts
  for select using (public.is_member_of(org_id));

create policy audit_report_drafts_insert on public.audit_report_drafts
  for insert with check (public.has_min_role(org_id, 'EMPLOYEE'));

create policy audit_report_drafts_update on public.audit_report_drafts
  for update using (public.has_min_role(org_id, 'EMPLOYEE'))
  with check (public.has_min_role(org_id, 'EMPLOYEE'));

create policy audit_report_drafts_delete on public.audit_report_drafts
  for delete using (public.has_min_role(org_id, 'MANAGER'));
